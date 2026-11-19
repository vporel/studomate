module.exports=[950632,a=>{"use strict";a.s(["default",()=>J],950632);var b=a.i(187924),c=a.i(580761);function d({position:a,size:c,color:d}){return(0,b.jsxs)("mesh",{position:a,children:[(0,b.jsx)("boxGeometry",{args:c}),(0,b.jsx)("meshStandardMaterial",{color:d})]})}var e=a.i(244588),f=a.i(572131),g=a.i(735258);let h="car-paint",i=["#e53935","#1e88e5","#fdd835","#43a047","#8e24aa","#f5f5f5"].map(a=>new g.MeshStandardMaterial({color:a,roughness:.4})),j=new g.MeshStandardMaterial({color:"#263238",roughness:.2}),k=new g.MeshStandardMaterial({color:"#1b1b1b",roughness:.9}),l=new g.MeshStandardMaterial({color:"#fff8e1",emissive:"#fff8e1",emissiveIntensity:.4}),m=new g.MeshStandardMaterial({color:"#c62828",emissive:"#c62828",emissiveIntensity:.4});function n({width:a,length:c}){let d=.035+.085,e=.5*c,f=-(.06*c),g=a/2-.015,n=c/2-.2*c,o=.3*a;return(0,b.jsxs)("group",{children:[(0,b.jsx)("mesh",{name:h,material:i[0],position:[0,.07750000000000001,0],children:(0,b.jsx)("boxGeometry",{args:[a,.085,c]})}),(0,b.jsx)("mesh",{material:j,position:[0,d+.035,f],children:(0,b.jsx)("boxGeometry",{args:[.84*a,.07,e]})}),(0,b.jsx)("mesh",{name:h,material:i[0],position:[0,d+.07+.006,f],children:(0,b.jsx)("boxGeometry",{args:[.86*a,.012,.92*e]})}),[-1,1].flatMap(a=>[-1,1].map(c=>(0,b.jsx)("mesh",{material:k,position:[a*g,.045,c*n],rotation:[0,0,Math.PI/2],children:(0,b.jsx)("cylinderGeometry",{args:[.045,.045,.03,16]})},`${a}${c}`))),[-1,1].map(d=>(0,b.jsxs)("group",{children:[(0,b.jsx)("mesh",{material:l,position:[d*o,.08600000000000001,c/2],children:(0,b.jsx)("boxGeometry",{args:[.2*a,.02,.006]})}),(0,b.jsx)("mesh",{material:m,position:[d*o,.08600000000000001,-c/2],children:(0,b.jsx)("boxGeometry",{args:[.2*a,.02,.006]})})]},d))]})}function o({read:a}){let d=(0,f.useRef)({NS1:[],NS2:[],EO1:[],EO2:[]});return(0,e.useFrame)(()=>{let b=a();if(b)for(let a of c.LANE_KEYS)d.current[a].forEach((d,e)=>{if(!d)return;let f=b[a][e];if(d.visible=!!f,!f)return;let{x:g,z:j}=(0,c.carPosition)(a,f.s);d.position.set(.01*g,.05,.01*j);let k=i[f.id%i.length];d.traverse(a=>{a.name===h&&(a.material=k)})})}),(0,b.jsx)(b.Fragment,{children:c.LANE_KEYS.map(a=>Array.from({length:12},(e,f)=>(0,b.jsx)("group",{visible:!1,rotation:[0,c.LANES[a].heading,0],ref:b=>{d.current[a][f]=b},children:(0,b.jsx)(n,{width:.01*c.CAR_WIDTH,length:.01*c.CAR_LENGTH})},`${a}-${f}`)))})}let p=[{key:"red",on:"#ff0000",off:"#6b1a1a",y:1.2},{key:"orange",on:"#ffa500",off:"#6b4c12",y:.95},{key:"green",on:"#00d94a",off:"#14502a",y:.7}];function q({position:a,rotationY:c,read:g}){let h=(0,f.useRef)({});return(0,e.useFrame)(()=>{let a=g();for(let{key:b,on:c,off:d}of p){let e=h.current[b];if(!e)continue;let f=a?.[b]===!0;e.color.set(f?c:d),e.emissive.set(f?c:"#000000"),e.emissiveIntensity=.6*!!f}}),(0,b.jsxs)("group",{position:a,rotation:[0,c,0],children:[(0,b.jsx)(d,{position:[0,.4,0],size:[.06,.8,.06],color:"#455a64"}),(0,b.jsx)(d,{position:[0,.95,0],size:[.24,.7,.2],color:"#212121"}),p.map(({key:a,off:c,y:d})=>(0,b.jsxs)("mesh",{position:[0,d,.11],children:[(0,b.jsx)("sphereGeometry",{args:[.08,16,16]}),(0,b.jsx)("meshStandardMaterial",{ref:b=>{h.current[a]=b},color:c,roughness:.9,toneMapped:!1,emissive:"#000000",emissiveIntensity:0})]},a))]})}function r({read:a}){return(0,b.jsx)(b.Fragment,{children:c.LANE_KEYS.map(d=>{let{position:e,rotationY:f}=function(a){let{axis:b,offset:d,heading:e}=c.LANES[a],f=(0,c.carPosition)(a,c.STOP_LINE)[b],g=Math.sign(d)*(c.HALF_CROSSING+12),[h,i]="z"===b?[g,f]:[f,g];return{position:[.01*h,0,.01*i],rotationY:e+Math.PI}}(d);return(0,b.jsx)(q,{position:e,rotationY:f,read:()=>a()?.[d]??null},d)})})}let s=2*c.HALF_CROSSING*.01,t=2*c.ROAD_HALF*.01,u="#455a64";function v(){return(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(d,{position:[0,0,0],size:[s,.1,t],color:u}),(0,b.jsx)(d,{position:[0,0,0],size:[t,.1,s],color:u}),(0,b.jsx)(d,{position:[0,.051,0],size:[s,.002,s],color:"#546e7a"}),Array.from({length:12},(a,e)=>{let f=((e+.5)/12-.5)*t;return Math.abs(f)<.01*c.HALF_CROSSING+.1?null:(0,b.jsxs)("group",{children:[(0,b.jsx)(d,{position:[0,.052,f],size:[.04,.002,.25],color:"#eceff1"}),(0,b.jsx)(d,{position:[f,.052,0],size:[.25,.002,.04],color:"#eceff1"})]},e)}),c.LANE_KEYS.map(a=>{let{axis:e,offset:f,direction:g}=c.LANES[a],h=.01*(0,c.carPosition)(a,c.STOP_LINE)[e],i="z"===e?[.01*c.HALF_CROSSING,.002,.06]:[.06,.002,.01*c.HALF_CROSSING];return(0,b.jsx)(d,{position:"z"===e?[.01*f,.052,h+.05*g]:[h+.05*g,.052,.01*f],size:i,color:"#eceff1"},a)})]})}var w=a.i(539705),x=a.i(160074);let y={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},z={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},A=f.forwardRef(({scale:a=10,frames:b=1/0,opacity:c=1,width:d=1,height:h=1,blur:i=1,near:j=0,far:k=10,resolution:l=512,smooth:m=!0,color:n="#000000",depthWrite:o=!1,renderOrder:p,...q},r)=>{let s,t,u=f.useRef(null),v=(0,x.useThree)(a=>a.scene),A=(0,x.useThree)(a=>a.gl),B=f.useRef(null);d*=Array.isArray(a)?a[0]:a||1,h*=Array.isArray(a)?a[1]:a||1;let[C,D,E,F,G,H,I]=f.useMemo(()=>{let a=new g.WebGLRenderTarget(l,l),b=new g.WebGLRenderTarget(l,l);b.texture.generateMipmaps=a.texture.generateMipmaps=!1;let c=new g.PlaneGeometry(d,h).rotateX(Math.PI/2),e=new g.Mesh(c),f=new g.MeshDepthMaterial;f.depthTest=f.depthWrite=!1,f.onBeforeCompile=a=>{a.uniforms={...a.uniforms,ucolor:{value:new g.Color(n)}},a.fragmentShader=a.fragmentShader.replace("void main() {",`uniform vec3 ucolor;
           void main() {
          `),a.fragmentShader=a.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );")};let i=new g.ShaderMaterial(y),j=new g.ShaderMaterial(z);return j.depthTest=i.depthTest=!1,[a,c,f,e,i,j,b]},[l,d,h,a,n]),J=a=>{F.visible=!0,F.material=G,G.uniforms.tDiffuse.value=C.texture,G.uniforms.h.value=a/256,A.setRenderTarget(I),A.render(F,B.current),F.material=H,H.uniforms.tDiffuse.value=I.texture,H.uniforms.v.value=a/256,A.setRenderTarget(C),A.render(F,B.current),F.visible=!1},K=0;return(0,e.useFrame)(()=>{B.current&&(b===1/0||K<b)&&(K++,s=v.background,t=v.overrideMaterial,u.current.visible=!1,v.background=null,v.overrideMaterial=E,A.setRenderTarget(C),A.render(v,B.current),J(i),m&&J(.4*i),A.setRenderTarget(null),u.current.visible=!0,v.overrideMaterial=t,v.background=s)}),f.useImperativeHandle(r,()=>u.current,[]),f.createElement("group",(0,w.default)({"rotation-x":Math.PI/2},q,{ref:u}),f.createElement("mesh",{renderOrder:p,geometry:D,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},f.createElement("meshBasicMaterial",{transparent:!0,map:C.texture,opacity:c,depthWrite:o})),f.createElement("orthographicCamera",{ref:B,args:[-d/2,d/2,h/2,-h/2,j,k]}))});var B=a.i(910129);let C=[0,.2,0],D=[4.6,4.4,5.4],E=D.map(a=>a/Math.hypot(...D)),F=2*c.ROAD_HALF*.01;function G(a,b){for(a.pendingMs+=b;a.pendingMs>=20;)a.state=c.default.step(a.state,20,function(a){let b=(a%2e4+2e4)%2e4,d=b<1e4?"NS":"EO",e=b%1e4,f=e<6e3?"green":e<8e3?"orange":"red",g={};for(let a of c.LANE_KEYS){let b=a.startsWith(d)?f:"red";g[`red${a}`]="red"===b,g[`orange${a}`]="orange"===b,g[`green${a}`]="green"===b}return g}(a.tMs)),a.tMs+=20,a.pendingMs-=20}function H(){let a=(0,f.useRef)(null);return a.current??=function(){let a={state:c.default.createState(),tMs:0,pendingMs:0};return G(a,9e3),a}(),(0,e.useFrame)((b,c)=>{a.current&&G(a.current,Math.min(1e3*c,100))}),(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(d,{position:[0,-.2,0],size:[F,.3,F],color:"#fafafa"}),(0,b.jsx)(v,{}),(0,b.jsx)(r,{read:()=>a.current?.state.lights??null}),(0,b.jsx)(o,{read:()=>a.current?.state.lanes??null})]})}function I(){let a=(0,x.useThree)(a=>a.camera),{width:b,height:c}=(0,x.useThree)(a=>a.size);return(0,f.useLayoutEffect)(()=>{let d=function(a,b,c){let[d,,e]=E,f=Math.tan(20*Math.PI/180);return Math.max(3.25/f,a*(Math.abs(d)+Math.abs(e))/Math.hypot(d,e)/2/(b/Math.max(c,1)*f))/.78}(F,b,c);a.position.set(...E.map((a,b)=>C[b]+a*d)),a.lookAt(...C)},[a,b,c]),null}function J({paused:a}){return(0,b.jsxs)(B.Canvas,{frameloop:a?"never":"always",dpr:[1,1.5],camera:{fov:40},style:{position:"absolute",inset:0,pointerEvents:"none"},children:[(0,b.jsx)(I,{}),(0,b.jsx)("ambientLight",{intensity:.7}),(0,b.jsx)("directionalLight",{position:[5,8,4],intensity:1.2}),(0,b.jsx)(H,{}),(0,b.jsx)(A,{position:[0,-.36,0],scale:1.6*F,blur:2.5,far:1.5,opacity:.35})]})}}];

//# sourceMappingURL=b1a17_ui_components_3d-illustrations_crossroads_CrossroadsIllustration_tsx_c9ca7b3c._.js.map