#!/usr/bin/env node
/**
 * scripts/stress-test-m4-confirm.js
 * Empirical stress test harness & generator for Milestone 4:
 * 1. Concurrent confirm dialog requests & promise resolution (bursts of 5, 10, 25, 50, 100, 250)
 * 2. Rapid interleaved confirm/cancel/supersede lifecycle (500 steps)
 * 3. In-flight async onConfirm overlap with incoming confirm requests
 * 4. Nested confirmation chains (modal inside modal onConfirm)
 * 5. Asynchronous rejections and synchronous exceptions in callbacks
 * 6. Headless fallback vs Subscribed mode equivalence
 */

const assert = require('assert');

async function runEmpiricalStress() {
  console.log('\n========================================');
  console.log('⚡ STRESS TEST: Milestone 4 Confirm Dialog Resilience');
  console.log('========================================\n');

  const { showConfirm, subscribeConfirm } = await import('../src/utils/feedback.js');

  let assertCount = 0;
  const failures = [];

  function check(condition, message) {
    assertCount++;
    if (!condition) {
      failures.push(message);
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // BATTERY 1: Concurrent Burst Superseding (5, 10, 25, 50, 100, 250 requests)
  // -------------------------------------------------------------------------
  console.log('▶ Battery 1: Concurrent Burst Superseding under Active Subscriber');

  const burstSizes = [5, 10, 25, 50, 100, 250];
  for (const size of burstSizes) {
    let currentPayload = null;
    const unsub = subscribeConfirm((payload) => {
      currentPayload = payload;
    });

    const promises = [];
    const cancelCalls = new Array(size).fill(0);
    const confirmCalls = new Array(size).fill(0);

    for (let i = 0; i < size; i++) {
      const idx = i;
      promises.push(
        showConfirm({
          title: `Burst ${size} - Item ${idx}`,
          message: `Testing concurrency at scale ${idx}`,
          onCancel: () => { cancelCalls[idx]++; },
          onConfirm: () => { confirmCalls[idx]++; }
        })
      );
    }

    check(currentPayload !== null, `Current payload should be populated for size ${size}`);
    check(currentPayload.title === `Burst ${size} - Item ${size - 1}`, `Current payload should reflect latest request for size ${size}`);

    // All superseded promises (0 to size - 2) MUST resolve to false
    for (let i = 0; i < size - 1; i++) {
      const result = await promises[i];
      check(result === false, `Superseded promise ${i} of ${size} must resolve to false (got ${result})`);
      check(cancelCalls[i] === 1, `onCancel for superseded item ${i} of ${size} must be called exactly once (got ${cancelCalls[i]})`);
      check(confirmCalls[i] === 0, `onConfirm for superseded item ${i} of ${size} must not be called (got ${confirmCalls[i]})`);
    }

    // Now confirm the final active dialog
    await currentPayload.onConfirm();
    const finalResult = await promises[size - 1];
    check(finalResult === true, `Final active promise of ${size} must resolve to true on confirm (got ${finalResult})`);
    check(confirmCalls[size - 1] === 1, `onConfirm for final active item of ${size} must be called exactly once (got ${confirmCalls[size - 1]})`);
    check(cancelCalls[size - 1] === 0, `onCancel for final active item of ${size} must not be called (got ${cancelCalls[size - 1]})`);

    unsub();
  }
  console.log(`  ✔ Completed ${burstSizes.length} concurrency burst sizes (Asserts: ${assertCount})`);

  // -------------------------------------------------------------------------
  // BATTERY 2: Interleaved Sequence of Confirmed, Cancelled, and Superseded Modals
  // -------------------------------------------------------------------------
  console.log('▶ Battery 2: Interleaved Sequence Lifecycle (500 steps)');
  {
    let currentPayload = null;
    const unsub = subscribeConfirm((payload) => {
      currentPayload = payload;
    });

    for (let step = 0; step < 500; step++) {
      const action = step % 4; // 0: confirm, 1: cancel, 2 & 3: supersede
      if (action === 0) {
        const p = showConfirm({ title: `Step ${step}` });
        await currentPayload.onConfirm();
        const res = await p;
        check(res === true, `Step ${step} confirmed must resolve true`);
      } else if (action === 1) {
        const p = showConfirm({ title: `Step ${step}` });
        currentPayload.onCancel();
        const res = await p;
        check(res === false, `Step ${step} cancelled must resolve false`);
      } else {
        // Supersede pair
        const p1 = showConfirm({ title: `Step ${step} A` });
        const p2 = showConfirm({ title: `Step ${step} B` });
        const res1 = await p1;
        check(res1 === false, `Step ${step} superseded A must resolve false`);
        await currentPayload.onConfirm();
        const res2 = await p2;
        check(res2 === true, `Step ${step} active B must resolve true`);
      }
    }

    unsub();
  }
  console.log(`  ✔ Completed 500 interleaved lifecycle steps (Asserts: ${assertCount})`);

  // -------------------------------------------------------------------------
  // BATTERY 3: In-Flight Async onConfirm Overlap with Incoming Request
  // -------------------------------------------------------------------------
  console.log('▶ Battery 3: In-Flight Async onConfirm Overlap');
  {
    let currentPayload = null;
    const unsub = subscribeConfirm((payload) => {
      currentPayload = payload;
    });

    let asyncDone = false;
    const p1 = showConfirm({
      title: 'In-Flight Async Modal',
      onConfirm: async () => {
        await new Promise((r) => setTimeout(r, 60));
        asyncDone = true;
      }
    });

    // User confirms p1
    currentPayload.onConfirm();

    // While onConfirm is in-flight (async work running), a new modal is requested:
    await new Promise((r) => setTimeout(r, 10));
    const p2 = showConfirm({
      title: 'Overlapping Incoming Modal'
    });

    const res1 = await p1;
    check(asyncDone === true, 'p1 onConfirm async work must finish');
    check(res1 === true, `p1 must resolve to true because user confirmed it! (Got ${res1})`);

    // Clean up p2
    currentPayload.onCancel();
    const res2 = await p2;
    check(res2 === false, 'p2 cancelled must resolve false');

    unsub();
  }
  console.log(`  ✔ Completed Battery 3 (Asserts: ${assertCount})`);

  // -------------------------------------------------------------------------
  // BATTERY 4: Nested Confirmation Dialogs (Modal inside Modal onConfirm)
  // -------------------------------------------------------------------------
  console.log('▶ Battery 4: Nested Confirmation Chains');
  {
    let currentPayload = null;
    const unsub = subscribeConfirm((payload) => {
      currentPayload = payload;
    });

    let innerResolved = false;
    let outerResolved = false;

    const outerPromise = showConfirm({
      title: 'Outer Modal',
      onConfirm: async () => {
        const innerPromise = showConfirm({
          title: 'Inner Modal (Are you really sure?)'
        });
        check(currentPayload.title === 'Inner Modal (Are you really sure?)', 'Inner modal should be active');
        await currentPayload.onConfirm();
        const innerRes = await innerPromise;
        check(innerRes === true, `Inner modal should resolve true (Got ${innerRes})`);
        innerResolved = true;
      }
    });

    check(currentPayload.title === 'Outer Modal', 'Outer modal should be active initially');
    await currentPayload.onConfirm();

    const outerRes = await outerPromise;
    check(outerRes === true, `Outer modal should resolve true (Got ${outerRes})`);
    outerResolved = true;

    check(innerResolved === true, 'Inner modal must have completed');
    check(outerResolved === true, 'Outer modal must have completed');

    unsub();
  }
  console.log(`  ✔ Completed Battery 4 (Asserts: ${assertCount})`);

  // -------------------------------------------------------------------------
  // BATTERY 5: Error Trapping & Exception Resilience
  // -------------------------------------------------------------------------
  console.log('▶ Battery 5: Error Trapping & Exception Handling in Callbacks');
  {
    let currentPayload = null;
    const unsub = subscribeConfirm((payload) => {
      currentPayload = payload;
    });

    // 5.1 Sync exception in onConfirm
    {
      const p = showConfirm({
        title: 'Sync Error onConfirm',
        onConfirm: () => {
          throw new Error('Fatal synchronous error in onConfirm');
        }
      });
      await currentPayload.onConfirm();
      const res = await p;
      check(res === true, 'Promise must resolve true even if onConfirm throws');
    }

    // 5.2 Async rejection in onConfirm
    {
      const p = showConfirm({
        title: 'Async Rejection onConfirm',
        onConfirm: async () => {
          throw new Error('Async network failure in onConfirm');
        }
      });
      await currentPayload.onConfirm();
      const res = await p;
      check(res === true, 'Promise must resolve true even if onConfirm async-rejects');
    }

    // 5.3 Sync exception in onCancel
    {
      const p = showConfirm({
        title: 'Sync Error onCancel',
        onCancel: () => {
          throw new Error('Fatal synchronous error in onCancel');
        }
      });
      currentPayload.onCancel();
      const res = await p;
      check(res === false, 'Promise must resolve false even if onCancel throws');
    }

    // 5.4 Superseded with sync exception in onCancel
    {
      const p1 = showConfirm({
        title: 'Superseded with Error in onCancel',
        onCancel: () => {
          throw new Error('Sync throw in superseded onCancel');
        }
      });
      const p2 = showConfirm({
        title: 'Second Modal'
      });
      const res1 = await p1;
      check(res1 === false, 'Superseded promise must resolve false even if its onCancel threw');
      await currentPayload.onConfirm();
      const res2 = await p2;
      check(res2 === true, 'Second modal must resolve true cleanly');
    }

    // 5.5 Async rejection in onCancel
    {
      let unhandledCaught = false;
      const unhandledListener = (reason) => {
        unhandledCaught = true;
      };
      process.on('unhandledRejection', unhandledListener);

      const p = showConfirm({
        title: 'Async Rejection onCancel',
        onCancel: async () => {
          throw new Error('Async cancel rejection');
        }
      });
      currentPayload.onCancel();
      const res = await p;
      check(res === false, 'Promise must resolve false on cancel');

      await new Promise((r) => setTimeout(r, 50));
      process.removeListener('unhandledRejection', unhandledListener);
      check(!unhandledCaught, 'Async onCancel rejection must NOT trigger unhandledRejection event');
    }

    unsub();
  }
  console.log(`  ✔ Completed Battery 5 (Asserts: ${assertCount})`);

  // -------------------------------------------------------------------------
  // BATTERY 6: Headless Fallback Mode Stress
  // -------------------------------------------------------------------------
  console.log('▶ Battery 6: Headless Mode (No Active Subscribers)');
  {
    for (let i = 0; i < 100; i++) {
      let confirmHit = false;
      const p = showConfirm({
        title: `Headless ${i}`,
        onConfirm: () => { confirmHit = true; }
      });
      const res = await p;
      check(res === true, `Headless mode ${i} should resolve true`);
      check(confirmHit === true, `Headless mode ${i} should invoke onConfirm`);
    }
  }
  console.log(`  ✔ Completed Battery 6 (Asserts: ${assertCount})`);

  console.log('\n========================================');
  console.log(`STRESS TEST SUMMARY: ${assertCount} asserts evaluated.`);
  if (failures.length > 0) {
    console.error(`💥 ${failures.length} VULNERABILITY FAILURES DETECTED:`);
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f}`);
    });
    console.log('========================================\n');
    process.exit(1);
  } else {
    console.log('🎉 ALL EMPIRICAL STRESS TESTS PASSED!');
    console.log('========================================\n');
    process.exit(0);
  }
}

runEmpiricalStress().catch((err) => {
  console.error('❌ Empirical stress test execution crashed:', err);
  process.exit(1);
});
