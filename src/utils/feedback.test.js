import {
  showToast,
  toast,
  subscribeToast,
  showConfirm,
  subscribeConfirm,
} from "./feedback";

describe("Feedback Utility (Toast & Confirm Emitter)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Toast bus", () => {
    test("subscribes to toast events and receives payload", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToast(listener);

      const item = showToast("Test message", "success", 4000);
      expect(listener).toHaveBeenCalledWith(item);
      expect(item.message).toBe("Test message");
      expect(item.type).toBe("success");
      expect(item.duration).toBe(4000);

      unsubscribe();
      showToast("Second message", "info");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("toast convenience methods trigger with correct types", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToast(listener);

      toast.info("Info msg");
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: "Info msg", type: "info" })
      );

      toast.success("Success msg");
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: "Success msg", type: "success" })
      );

      toast.warning("Warning msg");
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: "Warning msg", type: "warning" })
      );

      toast.error("Error msg");
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({ message: "Error msg", type: "error" })
      );

      unsubscribe();
    });

    test("falls back to window.alert when no toast listeners are registered", () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

      showToast("Fallback alert message", "info");
      expect(alertSpy).toHaveBeenCalledWith("Fallback alert message");

      alertSpy.mockRestore();
    });
  });

  describe("Confirm modal bus", () => {
    test("dispatches confirm payload to subscriber and resolves promise on confirm", async () => {
      let modalPayload;
      const unsubscribe = subscribeConfirm((payload) => {
        modalPayload = payload;
      });

      const onConfirm = jest.fn();
      const promise = showConfirm({
        title: "Test Title",
        message: "Test Message",
        onConfirm,
      });

      expect(modalPayload).toBeDefined();
      expect(modalPayload.title).toBe("Test Title");

      // Simulate user confirming
      await modalPayload.onConfirm();
      const result = await promise;

      expect(result).toBe(true);
      expect(onConfirm).toHaveBeenCalled();

      unsubscribe();
    });

    test("resolves false on cancel callback", async () => {
      let modalPayload;
      const unsubscribe = subscribeConfirm((payload) => {
        modalPayload = payload;
      });

      const onCancel = jest.fn();
      const promise = showConfirm({
        message: "Confirm deletion?",
        onCancel,
      });

      modalPayload.onCancel();
      const result = await promise;

      expect(result).toBe(false);
      expect(onCancel).toHaveBeenCalled();

      unsubscribe();
    });

    test("falls back to window.confirm when no confirm listeners are registered", async () => {
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
      const onConfirm = jest.fn();

      const result = await showConfirm({
        message: "Unattended test confirmation",
        onConfirm,
      });

      expect(confirmSpy).toHaveBeenCalledWith("Unattended test confirmation");
      expect(result).toBe(true);
      expect(onConfirm).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });
});
