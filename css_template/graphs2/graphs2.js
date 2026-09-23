var colors = ["f94144","f9844a","f9c74f","43aa8b","4d908e","577590","277da1"]

function makeChart(){  
  var i,
      arr = [],
      lis = document.getElementsByTagName("li")      

  for (i=0; i<lis.length; i++) arr.push( gsap.getProperty(lis[i], 'data-val') )
  
  var sum = arr.reduce((a,b)=>a+b),
      currentPercent = 0

  for (i=0; i<arr.length; i++){
    currentPercent += arr[i]/sum*100
    
    var dur = 3-1.5*i/arr.length,
        ez = 'power3',
        c = document.createElementNS("http://www.w3.org/2000/svg", "circle"),
        swatch = document.createElement('div'),
        color = '#'+colors[i%colors.length]
    pieChart.prepend(c)
        
    gsap.set(c, {attr:{
      'data-val':Math.round(arr[i]/sum*100),
      'data-sw':15*arr.length-10*i, //ref for the original stroke-width
      'data-n':i,
      cx:200,
      cy:200,
      r:50,
      stroke:color,
      'stroke-width':16*arr.length-10*i
    }})
  
    gsap.fromTo(c, {drawSVG:0}, {drawSVG:'0% '+(currentPercent)+'%', duration:dur, ease:ez, overwrite:'auto'})  
    
    c.addEventListener('pointerenter', (e)=>{
      var c = e.currentTarget,
          n = gsap.getProperty(c,'data-n')
      gsap.to('li', {opacity:(i)=>(i==n)?1:0.33})
      gsap.to(c, {ease:'expo', attr:{'stroke-width':15*arr.length-10*n+8}})
      gsap.to(nTxt, {
          ease:'power2.inOut',
          opacity:1,
          attr:{fill:gsap.getProperty(c,'stroke')},
          innerHTML:gsap.getProperty(c,'data-val')+'%',
          snap:'innerHTML'
      })
    })
    
    c.addEventListener('pointerleave', (e)=>{
      var c = e.currentTarget,
          n = gsap.getProperty(c,'data-n')
      
      gsap.to('li', {opacity:1})
      gsap.to(c, {ease:'expo', attr:{'stroke-width':15*arr.length-10*n}})
      gsap.to(nTxt, {opacity:0, ease:'power2.inOut'})      
    })
    
    lis[i].prepend(swatch)
        
    gsap.set(swatch, {marginBottom:3, width:'100%', height:11, background:color})
    
    if (i<=arr.length-2){
      var shade = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
      pieChart.append(shade);
      gsap.fromTo(shade, {
        attr:{ points:'243,200 350,200 350,210' },
        opacity:0.4-i/arr.length*0.35,
        pointerEvents:'none',
        transformOrigin:'200 200'
      },{
        rotate:currentPercent/100*360,
        duration:dur,
        ease:ez
      })
    }
  }
  
  gsap.set('#pieChart', {rotate:-90, svgOrigin:'200 200'})
}

makeChart();