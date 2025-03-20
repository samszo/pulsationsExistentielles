import anime from './anime.es.js';        
import {amazelogo} from './amazelogo.js';        
import {cartoHexa} from './cartoHexa.js';        
import * as hl from './hex-lib.js';
import * as ha from './hex-algorithms.js';
import {loader} from './loader.js';
import {Treeselect} from './treeselectjs.mjs.js'
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';


export class pulsationsExistentielles {
    constructor(params={}) {
        var me = this;
        this.id = params.id ? params.id : "pe";
        this.urlSvg=params.urlSvg ? params.urlSvg :"assets/img/pulsexistence.svg";
        this.cont=params.cont ? params.cont : d3.select("body");
        this.height=params.height ? params.height : 600;
        this.width=params.width ? params.width : 800;

        this.navbar = params.navbar ? params.navbar : d3.select('#navbarMain'), 
        this.sources = params.sources ? params.sources : false,
        this.infosRT = params.infosRT ? params.infosRT : false,
        
        this.loader = new loader(),
        this.omk = params.omk ? params.omk : false,
        this.tree = false,
        this.btnStart=params.btnStart ? params.btnStart : false;
        this.btnStop=params.btnStop ? params.btnStop : false;
        this.events=params.events ? params.events : {};
        
        this.svg = false;
        this.timelines = []; 
        this.ch = new cartoHexa({'noInit':true});
        this.raisonstrajectives=[],
        this.rt=false;
        let pa, slot, treeselect, 
            bbScene, maxloop = 4, numloop = 0, flux = [], 
            dur = 100, durMin = 500, durMax = 10000,
            layers = [
                {'id':'gActant', 'ordre':1},
                {'id':'gPhysicalites', 'ordre':2},
                {'id':'gInteriorite', 'ordre':3},
                {'id':'gCribles', 'ordre':4},// 'fct':showMazeCrible},//showHexaCrible},//   
                {'id':'gDiscerner', 'ordre':5},   
                {'id':'gRaisonner', 'ordre':6},   
                {'id':'gAgir', 'ordre':7},                                                
            ],
            //définition des positions
            m=10,
            pActant = {
                'nw':[83,115],
                'ne':[123,115],
                'e':[144,150],
                'se':[124,185],
                'sw':[84,185],
                'w':[63,151]
            },
            bbCribleD,bbCribleG,bbRaisonner,bbDicerner,bbAgir,extPathPoints,
            layoutBase, allHexa, polygonVerticesFlat,
            graph, graphCode, 
            fluxPlus=[], fluxMoins=[],estBon=[],linkPlus=[],linkMoins=[],links=[],items=[],
            aFlux=[], fluxAvant=[], fluxPendant=[], fluxApres=[];


        this.init = function () {
            console.log('init rt');
            mermaid.initialize({ startOnLoad: false,theme: 'dark', });

            layoutBase = me.ch.setLayout();
            allHexa = ha.makeHexagonalShape(1);
            polygonVerticesFlat = layoutBase
                .polygonCorners(new hl.Hex(0,0,0))
                .map(p=>`${p.x},${p.y}`)
                .join(" ");
                    
            //création es élément d'infos pour la raison trajective
            if(me.infosRT){
                me.infosRT.style("max-height",me.height+"px").style("overflow-y","auto");
                me.infosRT.append("h4").attr('id',"titreRT").text("Veuillez sélectionner une raison trajective");
                me.infosRT.append("p").attr("class","lead").attr('id',"auteurRT");
                me.infosRT.append("p").attr('class',"text-start fw-lighter").attr('id',"descRT");
                me.infosRT.append("h5").text("Détails des pulsations existentielles");
                me.infosRT.append("ol").attr('id',"detailsPulEx").attr("class","list-group");
            }
            //création des éléments de navigation
            if(me.navbar){
                me.tree = me.navbar.append("li").attr("class","d-flex").append("div").attr("class","treeselect-demo");        
                me.btnStart=me.navbar.append("li").attr("class","d-flex").append("button").attr("class","btn btn-outline-success");
                me.btnStart.append("i").attr("class","fa-regular fa-circle-play");
                
                me.btnStop=me.navbar.append("li").attr("class","d-flex ms-2").append("button").attr("class","btn btn-outline-success");
                me.btnStop.append("i").attr("class","fa-regular fa-circle-stop");
                pa = me.navbar.append("li").attr("class","d-flex")
                    .append("div")
                        .attr("class","progress")
                        .attr("role","progressbar")
                        .attr("aria-label","Progression animation")
                        .attr("aria-valuenow","0")
                        .attr("aria-valuemin","0")
                        .attr("aria-valuemax",100)
                            .append("div").attr("class","progress-bar bg-danger")
                                .attr("id","progressAnimation")
                                .attr("style","width: 0%").text("0%");
                slot = document.createElement('div'),
                slot.innerHTML = '<a class="treeselect-demo__slot" href="">Click!</a>';
                slot.addEventListener('click', (e) => {
                    e.preventDefault()
                    alert('Slot click!')
                });                    
            }            
            //Chargment des sources                
            d3.json(me.sources).then(data => {
                let options=data, jsonS=[];
                data.forEach((s,i) => {
                    if(s.url)jsonS.push(d3.json(s.url));
                    if(s.children){
                        s.children.forEach(c=>{
                            me.raisonstrajectives.push({'id':c.value,'o':c,'pulsations':[]});
                        });
                    }
                });
                Promise.all(jsonS).then((values) => {
                    values.forEach((dataStory,j)=>{
                        dataStory.forEach(ds=>{
                            let id = 's_'+j+'c'+ds['o:id'];
                            options[j].children.push({name: ds['o:title'],value:id,children: []}); 
                            me.raisonstrajectives.push({'id':id,'o':ds,'pulsations':[]});
                        })
                    });
                    treeselect = new Treeselect({
                        parentHtmlContainer: me.tree.node(),
                        value: [],
                        isSingleSelect: true,
                        options: options,
                        listSlotHtmlComponent: slot
                    })
                    treeselect.srcElement.addEventListener('input', (e) => {
                        console.log('Selected value:', e.detail);
                        me.showItemSelect(e.detail);
                    })
                    if(me.events.endInit)me.events.endInit();
                });
            });

            //chargement du modèle à animer
            d3.svg(me.urlSvg).then(xml=>{
                me.cont.node().appendChild(xml.documentElement);
                me.svg = me.cont.select("#svg1");
                bbScene = me.svg.select('#scene_1').node().getBBox();
                //affiche le graphique dans toute la div
                me.svg.attr("preserveAspectRatio","xMidYMid meet")		
                    .attr('width',me.width).attr('height',me.height)
                    .attr('viewBox',bbScene.x+" "+bbScene.y+" "+bbScene.width+" "+bbScene.height);            
                //récupère les dimension des layers
                layers.forEach(l=>{
                    if(l.idSize)
                        l.bb=d3.select("#"+l.id).node().getBoundingClientRect();
                    else
                        l.bb=d3.select("#"+l.id).node().getBBox();
                });
                bbCribleD = d3.select("#rect3").node().getBBox();
                bbCribleG = d3.select("#rect2").node().getBBox();
                bbRaisonner = d3.select("#text7").node().getBBox();
                bbDicerner = d3.select("#path32").node().getBBox();
                bbAgir = d3.select("#path34").node().getBBox();
                extPathPoints = [
                    {'x':{'min':bbScene.x-m,'max':bbScene.x+bbScene.width+m},'y':{'min':bbScene.y-m,'max':bbScene.y-m}},
                    {'x':{'min':bbCribleD.x+m,'max':bbCribleD.x+bbCribleD.width-m},'y':{'min':+bbCribleD.y+m,'max':bbCribleD.y+bbCribleD.height-m}},
                    {'x':{'min':pActant.nw[0]+m,'max':pActant.ne[0]-m},'y':{'min':pActant.nw[1]+m,'max':pActant.ne[1]-m}},
                    {'x':{'min':pActant.e[0]+m,'max':pActant.se[0]-m},'y':{'min':pActant.e[1]+m,'max':pActant.se[1]-m}},
                    {'x':{'min':bbCribleD.x+m,'max':bbDicerner.x-m},'y':{'min':bbDicerner.y,'max':bbDicerner.y+bbDicerner.height}},
                    {'x':{'min':pActant.w[0],'max':pActant.e[0]},'y':'4-1'},
                    {'forme':'spirale','minT':1,'maxT':10,'minR':0.2,'maxR':4},
                    {'x':'x-0-5','y':'y-0-5'},
                    {'x':{'min':bbAgir.x-m,'max':pActant.sw[0]+m},'y':{'min':bbAgir.y,'max':bbAgir.y+bbAgir.height}},
                    {'x':{'min':pActant.sw[0],'max':pActant.w[0]},'y':{'min':pActant.sw[1],'max':pActant.w[1]}},
                    {'x':{'min':pActant.nw[0]+m,'max':pActant.ne[0]-m},'y':{'min':pActant.nw[1],'max':pActant.ne[1]}},
                    {'x':{'min':bbCribleG.x+m,'max':bbCribleG.x+bbCribleG.width-m},'y':{'min':+bbCribleG.y+5,'max':bbCribleG.y+bbCribleG.height-5}},
                    {'x':{'min':bbScene.x-m,'max':bbScene.x+bbScene.width+m},'y':{'min':bbScene.y-m,'max':bbScene.y-m}}
                ];
                me.playRaisonTrajective('cacheModele');
            });
            //gestion des événement de l'IHM
            if(me.btnStop){
                me.btnStop.on('click',function(){
                    me.btnStart.attr('class','btn btn-outline-success');
                    me.btnStop.attr('class','btn btn-outline-danger');
                    me.timelines.forEach(tm=>tm.pause());
                })        
            }
            if(me.btnStart){
                me.btnStart.on('click',function(){
                    //if(me.timelines.length<1)me.playRaisonTrajective(null, me.rt[0].o); 
                    me.btnStart.attr('class','btn btn-outline-danger');
                    me.btnStop.attr('class','btn btn-outline-success');            
                    me.timelines.forEach(tm=>tm.play());
                })    
            }
        }

        this.showItemSelect=function(id){
            purgeIHM();

            /*si multiselect
            e.detail.forEach(id=>{
                me.rt.push(me.raisonstrajectives.filter(s=>s.id==id)[0]);
            });
            */
           //si isSingleSelect = true
           me.rt.push(me.raisonstrajectives.filter(s=>s.id==id)[0]);
           if(me.rt[0]){
                me.btnStart.attr('class','btn btn-outline-danger');
                me.btnStop.attr('class','btn btn-outline-success'); 
                //vérifie si le raisonstrajectives est dans omeka
                if(me.omk && me.rt[0].o['o:id']){
                    me.infosRT.select("#titreRT").text(me.rt[0].o['o:title']);
                    me.showRaisonTrajective();
                }else{
                    me.loader.hide(true);
                    me.infosRT.select("#titreRT").text(me.rt[0].o.name);
                    me.svg.style('display','block');
                    me.playRaisonTrajective(null, me.rt[0].o);
                }  
           }else{
                me.infosRT.select("#titreRT").text("Identifiant incorrect");
           }

        }

        this.showRaisonTrajective=function(){            
            me.loader.show();
            console.log(me.rt[0].o);
            if(me.rt[0].o["dcterms:description"])me.infosRT.select("#descRT").text(me.rt[0].o["dcterms:description"][0]["@value"]);
            me.infosRT.select("#titreRT").append('a').attr('href',me.omk.getAdminLink(null,me.rt[0].o["o:id"],"o:Item")).attr('target',"_blank")
            .append('img').attr('src','assets/img/OmekaS.png')
                .attr('class','mx-2')
                .style("height","20px");
            //récupère le propriétaire
            me.omk.getOwner(me.rt[0].o["o:owner"]["o:id"]).then(data => {
                me.rt[0].o.owner=data;
                me.infosRT.select("#auteurRT").text(data['o:name'])
                    .append("span").text(" ("+me.rt[0].o["o:modified"]["@value"].split("T")[0]+")");
                showPulsationsExistentielles(me.rt[0].o,"jdc:hasPulsationExistentielle",me.infosRT.select("#detailsPulEx"));
            });
        }

        function showPulsationsExistentielles(oSource, prop, contPE, flux=false){
            let erreurs = [], rsPE = oSource[prop];
            if(rsPE){
                //ordonne les pulsations par ordre dans le flux
                let pulExFlux = rsPE.filter(p=>{
                        if(p["@annotation"] && p["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"])return true
                        else{
                            erreurs.push({'message':"Dans la "+(flux ? "pulsation existentielle" : "raison trajective")+" :"
                                +"<p class='fw-bold'>"+oSource["o:title"]+"</p>"
                                +(flux ? "la temporalité du flux" : "L'ordre de la pulsation existentielle :")
                                +"<p class='fw-bold'>"+p.display_title+"</p>"
                                +(flux ? "n'est pas définie." : "n'est pas précisé.")
                                ,'link': me.omk.getAdminLink(null,oSource["o:id"],"o:Item")});                            
                            return false
                        }
                    }),
                    pulEx = pulExFlux.sort((a, b) => a["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"][0]["@value"] - b["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"][0]["@value"]),
                //création des pulsations
                    liPE = contPE.selectAll('li').data(pulEx)
                    .enter().append('li')
                        .attr('id',p=>"pe"+p.value_resource_id)
                        .attr("class","list-group-item  mt-2"),
                    divPE = liPE.append('div').attr('class','d-flex align-items-start justify-content-between');
                divPE.append('div')
                    .attr("class","ms-2 me-auto")
                    .append('div')
                        .attr("class","fw-bold")
                        .text(p=>p.display_title);
                divPE.append('span')
                    .attr("class",p=>{
                        let cl = "badge text-bg-";
                        cl += p["@annotation"] && p["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"] ? "success" : "danger";
                        cl += " rounded-pill";
                        return cl;
                        }) 
                    .text(p=>{
                        if(p["@annotation"] && p["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"])
                            return p["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"][0][flux ? "display_title" : "@value"]
                        else{
                            erreurs.push({'message':"Dans la pulsation existentielle :"
                                +"<p class='fw-bold'>"+p.display_title+"</p>"
                                +(flux ? "la temporalité du flux" : "L'ordre de la pulsation existentielle :")
                                +(flux ? "n'est pas définie." : "n'est pas précisé.")
                                ,'link': me.omk.getAdminLink(null,p.value_resource_id,"o:Item")});                            
                            return "?"
                        } 
                    });
                divPE.append('a')
                    .attr("class","badge") 
                    .attr('href',d=>{
                        return me.omk.getAdminLink(null,d.value_resource_id,"o:Item")
                    }).attr('target',"_blank")
                    .append('img').attr('src','assets/img/OmekaS.png')
                        .style("margin-top","-4px")
                        .style("height","20px");
                
                //création des pouvoirs
                let divPePo = liPE.append('div')
                    .attr("class","row"),
                    liPouv = divPePo.append('ul').attr("class","list-group").selectAll('li').data(pe=>{
                        pe.o = me.omk.getItem(pe.value_resource_id)
                        let pouvoirs = [];
                        if(pe.o["jdc:hasPouvoir"]){
                            pe.o["jdc:hasPouvoir"].forEach(po=>{
                                if(po.value_resource_id){
                                    po.o = me.omk.getItem(po.value_resource_id);
                                    pouvoirs.push({'pe':pe,'po':po.o});
                                }else erreurs.push({'message':"Dans la pulsation existentielle :<br>"
                                        +pe.o['o:title']+"<br>"
                                        +"Le pouvoir :<br>"
                                        +po["@value"]+" : n'est pas un item.",'link': me.omk.getAdminLink(null,pe.o['o:id'],"o:Item")});
                            });
                        }
                        return pouvoirs;
                    }).enter().append('li')
                        .attr("class","list-group-item d-flex justify-content-between align-items-start"),
                    divPouv = liPouv.append('div')
                        .attr("class","ms-2 me-auto")
                        .append('div')
                            .attr("class","fw-light text-start")
                            .text(p=>p.po['o:title']);
                liPouv.append('span')
                    .attr("class",p=>{
                        let cl = "badge text-bg-";
                        cl += p.po["dcterms:type"] ? "success" : "danger";
                        cl += " rounded-pill";
                        return cl;
                        }) 
                    .text(
                        p=>{
                            if(p.po["dcterms:type"])return p.po["dcterms:type"][0].display_title
                            else{
                                erreurs.push({'message':"Dans la pulsation existentielle :"
                                    +"<p class='fw-bold'>"+p.pe["o:title"]+"</p>"
                                    +"Le type de pouvoir de :"
                                    +"<p class='fw-bold'>"+p.po["o:title"]+"</p>"
                                    +"n'est pas précisé.",'link': me.omk.getAdminLink(null,p.po["o:id"],"o:Item")});                            
                                return "?"
                            } 
                        });
                liPouv.append('a')
                    .attr("class","badge") 
                    .attr('href',p=>{
                        return me.omk.getAdminLink(null,p.po['o:id'],"o:Item")
                    }).attr('target',"_blank")
                    .append('img').attr('src','assets/img/OmekaS.png')
                        .style("margin-top","-4px")
                        .style("height","20px");
                        
                //création des flux associés
                let divPeFlux = liPE.append('div')
                    .attr("class","row")                    
                    .append('ul').attr("id",p=>"fluxPE"+p.value_resource_id).attr("class","list-group mt-1 ms-3");
                divPeFlux.each((p,i)=>{
                    if(!flux)showPulsationsExistentielles(p.o,"jdc:flux",d3.select("#fluxPE"+p.value_resource_id),true);
                });
            }else{
                contPE.append('li').text('Pas de pulsations existentielles');
            }
            if(erreurs.length>0){
                contPE.append('li').attr("class","list-group-item").append('ul').attr("class","list-group").selectAll('li').data(erreurs)
                    .enter().append('li')
                        .attr("class","list-group-item list-group-item-danger")
                        .html(e=>e.message)
                        .append('a')
                        .attr('href',e=>e.link).attr('target',"_blank")
                        .append('img').attr('src','assets/img/OmekaS.png')
                            .style("margin-top","-4px")
                            .style("height","20px");

            }
            me.createDiagram();
            me.loader.hide(true);
        }


        function purgeIHM(){
            me.rt=[];
            me.timelines.forEach(tm=>tm.remove());
            me.timelines=[];
            me.playRaisonTrajective('cacheModele');
            me.infosRT.select("#detailsPulEx").selectAll("li").remove();
            me.infosRT.select("#titreRT").text("Veuillez sélectionner une raison trajective");
            me.infosRT.select("#auteurRT").text("");
            me.infosRT.select("#descRT").text("");
            clearMermaid();
        }

        this.playRaisonTrajective=function(nom, s){
            if(s && s.fct)eval(s.fct);
            else {
                if(s && s.playRaisonTrajective && !nom)nom=s.playRaisonTrajective;
                showDetailFlux(nom);
                switch (nom) {
                    case 'cacheModele':
                        layers.forEach(l=>{
                            me.svg.select("#"+l.id).style("opacity", 0);
                        })
                        break;        
                    case 'montreModele':
                        layers.forEach(l=>{
                            me.svg.select("#"+l.id).style("opacity", 1);
                            if(l.fct)l.fct(l);
                        })
                        break;        
                    case 'cache':
                        me.svg.selectAll(".cache").style("opacity", 0);
                        break;        
                    default:
                        break;
                }
            }
        }
        function showDetailFlux(nom){
            if(me.infosRT){
                me.infosRT.select("#detailsPulEx").append("li").text(nom);
            }
        }        
        function setProgress(v){
            pa.style('width',parseInt(v)+'%').text(parseInt(v)+'%');
        }
        function animationAllEnd(){
            me.btnStart.attr('class','btn btn-outline-success');
            me.btnStop.attr('class','btn btn-outline-success');
        }

        function showMazeCrible(l){
            me.svg.select('#rectCribles').attr("opacity",0);
            let aml = new amazelogo({
                'idCont': me.svg.attr('id'),
                'cont': me.svg,
                'colorMur': 'black',
                'colorPoint': 'green',
                'width':l.bb.width,
                'height':l.bb.height,
                'posis':l.bb,
                'inSVG':true
            }), maze = aml.getMaze(32,6);
            console.log(maze);
        }
        function showHexaCrible(l){
            let nbCrible = 3, w = l.bb.width/nbCrible;
            for (let i = 0; i < nbCrible; i++) {
                let bb = {'width':w,'height':l.bb.height,"x":l.bb.x+(l.bb.width/nbCrible*i),'y':l.bb.y};
                newHexaCrible(me.svg.append('svg').attr('id',me.id+'svgHC'+i), bb);                
            }
        }

        function newHexaCrible(svgHexa,bb){
            svgHexa.attr('width',bb.width).attr('height',bb.height)
                .attr('x',bb.x).attr('y',bb.y)
                .attr('viewBox',me.ch.getViewBox(allHexa).join(' '));
            let gHexa = svgHexa.selectAll('.gInit').data(allHexa).enter().append('g')
                    .attr('class',(g,i)=>'gInit'+i)
                    .attr('id',(h,i)=>{
                        h.layout = layoutBase;
                        h.subShapeDetail = 2;
                        h.depth = 0;
                        h.id = me.id+'_hexa_'+h.depth+'_'+h.q+'_'+h.r+'_'+h.s;
                        return h.id;
                    })
                    .attr('transform',h=>me.ch.hexCenter(h,layoutBase).transform)
                    //.on(me.eventCreate,addNewEspace)
                    .append('polygon').attr('points',polygonVerticesFlat)
                    .attr('fill','none').attr('stroke','black');                              
        }

        function seTromper(s){
            me.playRaisonTrajective('montreModele');
            //création du conteneur
            let dur=3000,index = 'pulsationseTromper', gScene = d3.select("#svg1").append('g').attr('id',index),
            xImg= 150, yImg = 40, xImgCrible= 130, yImgCrible = 80, xImgCribleOut= 60, xTextOut= 20,
            fluxPath, tm, c = 'red',m=10, ap1, ap2, ap3, pathPoints, paths,
            gTextOut;
            //ajoute une image dans les physicalité
            gScene.append('image')
                .attr('id',index+'Img')
                .attr('x',-100).attr('y',-100).attr('height',0)
                .attr('xlink:href','assets/img/papi-arcanes23.png');
            //ajouter l'oeil dans le crible
            gScene.append('image')
                .attr('id',index+'ImgCrible')
                .attr('x',xImgCrible).attr('y',yImgCrible).attr('height',bbCribleD.height)
                .attr('opacity',0)
                .attr('xlink:href','assets/img/Iris_-_left_eye_of_a_girl.jpg');

            //ajoute les path du flux            
            fluxPath = gScene.append('g').attr('class','fluxPath');
            ap1 = [
                [xImg+bbCribleD.height/2,yImg+bbCribleD.height/2],
                [pActant.ne[0]-m,pActant.ne[1]],
                [pActant.se[0],pActant.se[1]],
                [bbDicerner.x, bbRaisonner.y],
                [bbRaisonner.x+bbRaisonner.width/2,bbRaisonner.y]
                ];
            ap2 = [
                [bbRaisonner.x+bbRaisonner.width/2,bbRaisonner.y],
                [bbAgir.x, bbAgir.y],
                [pActant.sw[0],pActant.sw[1]],
                [pActant.nw[0]+m*2,pActant.nw[1]],
                [xImgCribleOut,yImgCrible],                
                ];
            ap3 = [
                [xImgCribleOut,yImgCrible],                
                [bbCribleG.x+bbCribleG.height/2,yImg+3+bbCribleG.height/2],
                ];
            pathPoints = [
                {'type':'curve','dur':dur,'d':d3.line().curve(d3.curveBasis)(ap1)},
                {'type':'spirale','dur':dur
                    ,'d':d3.lineRadial().curve(d3.curveBasis)(getSpiralPath(8,1))
                    ,'prev':[bbRaisonner.x+bbRaisonner.width/2,bbRaisonner.y]},
                {'type':'curve','dur':dur,'d':d3.line().curve(d3.curveBasis)(ap2)},
                {'type':'curve', 'dur':dur,'d':d3.line().curve(d3.curveBasis)(ap3)},
            ];
            paths = fluxPath.selectAll('.fluxPath')
                .data(pathPoints).enter()
                .append('path')  
                .attr('d', d=>d.d)
                .attr('id', (d,i)=>{
                    d.id = index+'fluxPath'+i;
                    return d.id;
                    })
                .attr('class',d=>index+'fluxPath')
                .attr('opacity',0)
                .attr('fill','none')
                .attr('stroke', c)
                .attr('stroke-opacity',0.3)
                .attr('stroke-width', 2)
                .attr('transform',d=>{
                    return d.type=='spirale'?`translate(${d.prev[0]},${d.prev[1]})`:''
                });
            //ajoute la bouche qui parle
            gScene.append('image')
                .attr('id',index+'ImgCribleOut')
                .attr('x',xImgCribleOut).attr('y',yImgCrible).attr('height',bbCribleD.height)
                .attr('opacity',0)
                .attr('xlink:href','assets/img/23coaches-frames-jumbo-v18.gif');
            //ajoute le texte tromper
            gTextOut = gScene.append('g')
                .attr('id',index+'TextOut')
                .attr('transform','translate('+20+' '+50+')')
                .attr('opacity',0);
            gTextOut.append('rect').attr('width',74).attr('height',10)
                .attr('id',index+'TextOutRect')
                .attr('style','fill:#ffffff;stroke:#000000;stroke-width:0.751466')
            gTextOut.append('text')
                .attr('id',index+'TextOutText')
                .attr('x',2).attr('y',8).attr('height',bbCribleD.height)
                .attr('style','font-style:normal;font-weight:normal;font-size:8px;line-height:1.25;font-family:sans-serif;fill:#000000;fill-opacity:1;stroke:none')
                .text('Ho! Le bel oiseau...');
            //excute la timeline    
            tm = anime.timeline({
                    easing: 'easeInOutSine',
                    direction: 'normal',
                    loop: false,
                    update: function(anim) {
                        setProgress(tm.progress);
                    },
                    complete: function(anim) {
                        console.log('ALL completed');
                        animationAllEnd();
                    }
                    });
            //affiche l'image
            tm.add({
                targets: '#'+index+'Img',
                x: xImg,
                y: yImg,
                height: bbCribleD.height,
                duration: dur,
                easing: 'easeInOutQuad'
            })
            //affiche le crible
            .add({
                targets: '#'+index+'ImgCrible',
                opacity: 1,
                duration: dur,
                easing: 'easeInOutQuad'
            })
            
            //affiche les path
            paths.each((d,i)=>{
                tm.add({
                    targets: '#'+d.id,
                    duration: d.dur,
                    opacity:1,
                    strokeDashoffset: [anime.setDashoffset, 0],
                });
                if(i==2){
                    //affiche la bouche qui parle
                    tm.add({
                        targets: '#'+index+'ImgCribleOut',
                        opacity: 1,
                        duration: dur,
                        easing: 'easeInOutQuad'
                    })
                }
            })
            //affiche le texte
            tm.add({
                targets: '#'+index+'TextOut',
                opacity: 1,
                duration: dur,
                easing: 'easeInOutQuad'
            })
            //masque le textOut et la bouche qui parle
            tm.add({
                targets: '#'+index+'TextOut',
                opacity: 0,
                duration: dur,
                easing: 'easeInOutQuad'
            })
            tm.add({
                targets: '#'+index+'ImgCribleOut',
                opacity: 0,
                duration: dur/2,
                easing: 'easeInOutQuad'
            })
            //masque les paths
            tm.add({
                targets: '.'+index+'fluxPath',
                duration: dur,
                opacity:0,
            });
            //met les lunettes
            tm.add({
                targets: '#'+index+'ImgCrible',
                opacity:0,
                duration: dur,
                easing: 'easeInOutQuad',
                complete: function(anim) {
                    d3.select('#'+index+'ImgCrible')
                    .attr('xlink:href',"assets/img/gros-plan-femme-aux-yeux-bleus-lunettes_135140-420.avif")
                }
            })
            tm.add({
                targets: '#'+index+'ImgCrible',
                opacity:1,
                duration: dur,
                easing: 'easeInOutQuad'
            },'-='+dur)

            //reaffiche les paths
            paths.each((d,i)=>{
                tm.add({
                    targets: '#'+d.id,
                    duration: d.dur,
                    opacity:1,
                    strokeDashoffset: [anime.setDashoffset, 0],
                });
                if(i==2){
                    //affiche la bouche qui parle
                    tm.add({
                        targets: '#'+index+'ImgCribleOut',
                        opacity: 1,
                        duration: dur,
                        easing: 'easeInOutQuad',
                        complete: function(anim) {
                            //change le textOut
                            d3.select('#'+index+'TextOutText').text("Ceci n'est pas un Papillon !")
                            //change la taille du rectangle
                            d3.select('#'+index+'TextOutRect').attr('width',100);
                        }        
                    })        
                }
            })
            //
            //affiche le texte
            tm.add({
                targets: '#'+index+'TextOut',
                opacity: 1,
                duration: dur,
                easing: 'easeInOutQuad'
            })
            
            me.timelines.push(tm);

        }

        function etreTrompe(l){
            me.playRaisonTrajective('montreModele');
            //création du conteneur
            let dur=3000,index = 'sceneEtreTromper', gScene = d3.select("#svg1").append('g').attr('id',index),
            fluxPath, tm,c = 'red',m=10, ap1, ap2, pathPoints, paths;
            //ajoute les path du flux            
            fluxPath = gScene.append('g').attr('class','fluxPath');
            ap1 = [
                [bbCribleD.x+bbCribleD.height/2,bbCribleD.y+bbCribleD.height/2],
                [pActant.ne[0]-m,pActant.ne[1]],
                [pActant.se[0],pActant.se[1]],
                [bbDicerner.x, bbRaisonner.y],
                [bbRaisonner.x+bbRaisonner.width/2,bbRaisonner.y]
                ];
            ap2 = [
                [bbRaisonner.x+bbRaisonner.width/2,bbRaisonner.y],
                [bbAgir.x, bbAgir.y],
                [pActant.sw[0],pActant.sw[1]],
                [pActant.nw[0]+m*2,pActant.nw[1]],
                [bbCribleG.x+bbCribleG.height/2,bbCribleG.y+3+bbCribleG.height/2],
                ];
            pathPoints = [
                {'type':'curve','dur':dur,'d':d3.line().curve(d3.curveBasis)(ap1)},
                {'type':'spirale','dur':dur
                    ,'d':d3.lineRadial().curve(d3.curveBasis)(getSpiralPath(18,2))
                    ,'prev':[bbRaisonner.x+bbRaisonner.width/2,bbRaisonner.y]},
                {'type':'curve','dur':dur,'d':d3.line().curve(d3.curveBasis)(ap2)}
            ];
    
            paths = fluxPath.selectAll('.fluxPath')
                .data(pathPoints).enter()
                .append('path')  
                .attr('d', d=>d.d)
                .attr('id', (d,i)=>{
                    d.id = index+'fluxPath'+i;
                    return d.id;
                    })
                .attr('class',d=>index+'fluxPath')
                .attr('opacity',0)
                .attr('fill','none')
                .attr('stroke', c)
                .attr('stroke-opacity',0.3)
                .attr('stroke-width', 2)
                .attr('transform',d=>{
                    return d.type=='spirale'?`translate(${d.prev[0]},${d.prev[1]})`:''
                });
            //ajoute le curseur de passe
            gScene.append('circle')
                .attr('id',index+'Cursor')
                .attr('r',3)
                .attr('cx',bbScene.x).attr('cy',bbScene.y)
                .attr('fill','green');
            //excute la timeline    
            tm = anime.timeline({
                    easing: 'easeInOutSine',
                    direction: 'normal',
                    loop: false,
                    update: function(anim) {
                        setProgress(tm.progress);
                    },
                    complete: function(anim) {
                        console.log('ALL completed');
                        animationAllEnd();
                    }
                    });
            //affiche les path
            paths.each((d,i)=>{
                tm.add({
                    targets: '#'+d.id,
                    duration: d.dur,
                    opacity:1,
                    strokeDashoffset: [anime.setDashoffset, 0],
                });
                //parcourt le chemin
                let path = anime.path('#'+index+'fluxPath'+i);            
                tm.add({
                    targets: '#'+index+'Cursor',
                    translateX: path('x'),
                    translateY: path('y'),
                    easing: 'linear',
                    duration: dur,
                  },'-='+(dur-500));             
            })
            for (let j = 0; j < 10; j++) {       
                for (let i = 0; i < 3; i++) {
                    let path = anime.path('#'+index+'fluxPath'+i);            
                    tm.add({
                        targets: '#'+index+'Cursor',
                        translateX: path('x'),
                        translateY: path('y'),
                        easing: 'linear',
                        duration: dur,
                    });                             
                }
            }
            me.timelines.push(tm);

        }

        function presenteModele(){
            me.playRaisonTrajective('cacheModele');
            layers.sort((a, b) => a.ordre - b.ordre);
            let dur=6000, delay=0;
            setProgress(0);
            me.timelines=[];
            let tm = anime.timeline({
                easing: 'easeInOutSine',
                duration: dur,
                update: function(anim) {
                    setProgress(tm.progress);
                },
                complete: function(anim) {
                    console.log('ALL completed');
                    animationAllEnd();
                  }
                });
            layers.forEach((l,i)=>{
                tm.add({
                    targets: '#'+l.id,
                    opacity: 1,
                })
            })
            me.timelines.push(tm);

        }
        function montreFluxAlea(){
            me.playRaisonTrajective('montreModele');
            me.timelines = [];
            //ajoute les path de flux aléatoires            
            let fluxPath = d3.select("#svg1").append('g').attr('id','fluxPathAlea'),
                nb = d3.randomInt(1, 10)();
            for (let index = 0; index < nb; index++) {
                let c = d3.interpolateInferno(Math.random()),
                    paths = fluxPath.selectAll('.fluxPath')
                        .data(getAleaPath(extPathPoints)).enter()
                        .append('path')  
                        .attr('d', d=>d.d)
                        .attr('id', (d,i)=>{
                            d.id = 'fluxPath_'+index+'_'+i;
                            return d.id;
                            })
                        .attr('class',d=>'fluxPath'+d.type)
                        .attr('fill','none')
                        .attr('stroke', c)
                        .attr('stroke-opacity',0.3)
                        .attr('stroke-width', 2)
                        .attr('transform',d=>{
                            return d.type=='spirale'?`translate(${d.prev[0]},${d.prev[1]})`:''
                        });                       
                showFlux(paths);
            }
        }
        
        function showFlux(paths){

            let offset=0, tm = anime.timeline({
                easing: 'easeInOutSine',
                direction: 'normal',
                loop: false,
                update: function(anim) {
                    setProgress(tm.progress);
                },
                complete: function(anim) {
                    console.log('ALL completed');
                    animationAllEnd();
                }
                });

            paths.each((d,i)=>{
                tm.add({
                        targets: '#'+d.id,
                        duration: d.dur,
                        strokeDashoffset: [anime.setDashoffset, 0],
                    })
            })
            paths.each((d,i)=>{
                tm.add({
                    targets: '#'+d.id,
                    delay: d.delayPersist,
                    duration: d.durPersist,
                    opacity:0,
                });
            })

            me.timelines.push(tm);
                        
        }
        function getAleaPath(points){
            let paths=[], arrP = [], ap = [], prev, dur=[], spiT, spiR;
            points.forEach((p,i)=>{
                if(p.forme){
                    switch (p.forme) {
                        case 'spirale':
                            //récupére la position précédente                    
                            prev = ap[i-1];
                            //enregistre le chemin précédent
                            dur.push(d3.randomInt(durMin, durMax)());
                            paths.push({'type':'curve','delay':0, delayPersist: 0
                                , 'dur':dur[dur.length-1],durPersist: d3.randomInt(durMin, durMax)()
                                ,'d':d3.line().curve(d3.curveBasis)(ap)});
                            arrP.push(ap);
                            //calcule une spirale aléatoire
                            ap = getSpiralPath(d3.randomInt(p.minT, p.maxT)()*6,Math.random(p.minR, p.maxR));
                            //enregistre le chemin pour la spirale
                            dur.push(d3.randomInt(durMin, durMax)());
                            paths.push({'type':'spirale','delay':0, delayPersist: d3.randomInt(durMin, durMax)()
                                , 'dur':dur[dur.length-1], durPersist: d3.randomInt(durMin, durMax)()
                                ,'d':d3.lineRadial().curve(d3.curveBasis)(ap),'prev':prev});
                            arrP.push(ap);
                            ap=[];
                        break;
                    }
                }else{
                    let rx=p.x.min ? false : p.x.split('-'), 
                        ry=p.y.min ? false : p.y.split('-'),             
                    x = p.x.min ? d3.randomInt(p.x.min, p.x.max)() 
                        : rx.length == 3 ? arrP[rx[1]][rx[2]][0] : ap[rx[0]][0],
                    y = p.y.min ? d3.randomInt(p.y.min, p.y.max)() 
                        : ry.length == 3 ? arrP[ry[1]][ry[2]][1] : ap[ry[0]][1];
                    ap.push([x,y]);
                }
            });
            dur.push(d3.randomInt(durMin, durMax)());
            paths.push({'type':'curve','delay': 0
                , 'dur':dur[dur.length-1],durPersist: d3.randomInt(durMin, durMax)(), delayPersist: d3.randomInt(durMin, durMax)()
                ,'d':d3.line().curve(d3.curveBasis)(ap)});
            return paths;
        }        

        function getSpiralPath(spiT,spiR){
            //calcule une spirale aléatoire
            let ap = Array.from({ length: spiT }, (_, i) => [
                    (Math.PI / 3) * i, // angle (in radians)
                    spiR * i // radius
                ]);
            //retourne au centre
            ap.push([0,0]); 
            return ap;           
        }


        function clearMermaid(){
            me.svg.style('display','none');
            me.cont.selectAll('pre').remove();
            me.cont.selectAll('div').remove();
            graph = me.cont
                .append('pre').attr('id','mermaidGraph').attr("class","mermaid");
        }

        this.createDiagram = async function(){
            fluxPlus=[], fluxMoins=[],estBon=[],linkPlus=[],linkMoins=[],links=[],items=[],
            aFlux=[], fluxAvant=[], fluxPendant=[], fluxApres=[];
            clearMermaid();
            let niv = 0;
            graphCode = `
            %%{
                init: {
                  'theme': 'black',
                  'themeVariables': {
                    'edgeLabelBackground':'white'
                  }
                }
            }%%
            flowchart TD`;
            //create raison trajective
            if(me.rt[0].o['o:title']){
                graphCode += `
                    raisonTrajective[${me.rt[0].o['o:title']}];
                    rtEnd[Fin du flux]`;
                //create flow for each pulsation existentielles dans l'odre défini
                //ordonne les pulsations par ordre dans le flux
                let pulExFlux = me.rt[0].o["jdc:hasPulsationExistentielle"].filter(p=>p["@annotation"] && p["@annotation"]["jdc:flux"]),
                    pulEx = pulExFlux.sort((a, b) => a["@annotation"]["jdc:flux"][0]["@value"] - b["@annotation"]["jdc:flux"][0]["@value"]);
                createPulsationSubgraph(pulEx,'raisonTrajective -->',niv);
            }else{
                graphCode += `
                    raisonTrajective[Start] -->pulsations{Pas de pulsations existentielles};
                    pulsations --> rtEnd[Fin du flux]
                    `;
            }

            graphCode += `
            classDef StartEnd fill:green,stroke:white,stroke-width:8px
            classDef fluxPlus fill:green,stroke:green,stroke-width:4px
            classDef fluxMoins fill:red,stroke:red,stroke-width:4px,color:white
            classDef estBon fill:orange,stroke:orange,stroke-width:8px,color:black
            
            class raisonTrajective,rtEnd,pulsations StartEnd;
            `;
            if(fluxPlus.length)graphCode+= `class ${fluxPlus.join(',')} fluxPlus;
            `;
            if(fluxMoins.length)graphCode+= `class ${fluxMoins.join(',')} fluxMoins;
            `;
            if(estBon.length)graphCode+= `class ${estBon.join(',')} estBon;
            `;
            if(linkPlus.length)graphCode+= `linkStyle ${linkPlus.join(',')} stroke:green,color:green,stroke-width:4px,color:green
            `;
            if(linkMoins.length)graphCode+= `linkStyle ${linkMoins.join(',')} stroke:red,color:red
            `;

            //render graphCode
            console.log(graphCode);        
            graph.html(graphCode);
            await mermaid.run({
                querySelector: '#mermaidGraph',
                postRenderCallback: (id) => {
                    const container = document.getElementById("mermaidGraph");
                    const svgElement = container.querySelector("svg");
            
                    // Initialize Panzoom
                    const panzoomInstance = Panzoom(svgElement, {
                        maxScale: 5,
                        minScale: 0.5,
                        step: 0.1,
                    });
            
                    // Add mouse wheel zoom
                    container.addEventListener("wheel", (event) => {
                        panzoomInstance.zoomWithWheel(event);
                    });
                }
              });
        }

        //create event subgraph
        function createPulsationSubgraph(rs,startNode,niv){
            //${startNode} |${vr["@annotation"] && p["@annotation"][flux ? "dcterms:temporal" : "jdc:flux"] ? "success" : "danger";}|item${vr.value_resource_id}                                        

            rs.forEach((vr,j)=>{
                //check if node exist
                let numFlux = vr["@annotation"] && vr["@annotation"]["jdc:flux"] ? vr["@annotation"]["jdc:flux"][0]["@value"] : "???";
                if(items[vr.value_resource_id]){
                    graphCode += `
                    ${startNode} |${numFlux}|item${vr.value_resource_id}                                        
                    `;
                    links++;
                    if(startNode.startsWith('pulsations'))linkPlus.push(links);
                    if(startNode.startsWith('pouvoirPlus'))linkPlus.push(links);
                    if(startNode.startsWith('pouvoirMoins'))linkMoins.push(links);
                }else{
                    graphCode += `
                    subgraph peItem${vr.o['o:id']}[-]`;
                    graphCode += `
                    item${vr.o['o:id']}[${vr.o['o:title']}]-->estBon${vr.o['o:id']}{est bon ?}
                    estBon${vr.o['o:id']}-->|yes|pouvoirPlus${vr.o['o:id']}{le pouvoir augmente}
                    estBon${vr.o['o:id']}-->|no|pouvoirMoins${vr.o['o:id']}{le pouvoir diminu}
                    end
                    `;
                    if(j>0){
                        let numFluxPrev = rs[j-1]["@annotation"] && rs[j-1]["@annotation"]["jdc:flux"] ? rs[j-1]["@annotation"]["jdc:flux"][0]["@value"] : "???";
                        graphCode += `
                        item${rs[j-1].o['o:id']}-->|${numFluxPrev+' -> '+numFlux}|item${vr.o['o:id']}                                        
                        `;
                    }else{
                        graphCode += `
                        ${startNode} |${numFlux}|item${vr.o['o:id']}                                        
                        `;    
                    }
                    /*ajoute le pouvoirs
                    if(r['jdc:hasPouvoir']){
                        graphCode += `
                        item${r['o:id']}[${r['o:title']}]-->estBon${r['o:id']}{est bon ?}
                        estBon${r['o:id']}-->|yes|pouvoirPlus${r['o:id']}{le pouvoir augmente}
                        estBon${r['o:id']}-->|no|pouvoirMoins${r['o:id']}{le pouvoir diminu}
                        end
                        ${startNode} |${op['o:label']}|item${r['o:id']}                                        
                        `;
                        estBon.push(`estBon${r['o:id']}`);
                        fluxMoins.push(`pouvoirMoins${r['o:id']}`);
                        fluxPlus.push(`pouvoirPlus${r['o:id']}`);
                        links++;
                        linkPlus.push(links);
                        links++;
                        linkPlus.push(links);
                        links++;
                        linkMoins.push(links);
                        links++;
                        linkPlus.push(links);
                        //create fail event
                        createPulsationSubgraph(r,'jdc:hasPouvoir','pouvoirMoins'+r['o:id']+'-->',niv+1);
                        //create valid event
                        createPulsationSubgraph(r,'jdc:hasPouvoir','pouvoirPlus'+r['o:id']+'-->',niv+1);
                    }else{
                        graphCode += `
                        item${r['o:id']}[${r['o:title']}]
                        end
                        ${startNode} |${op['o:label']}|item${r['o:id']}                                        
                        item${r['o:id']} --> |Pas de flux|rtEnd                                        
                        `;
                        links++;
                        if(startNode.startsWith('pulsations'))linkPlus.push(links);
                        if(startNode.startsWith('pouvoirPlus'))linkPlus.push(links);
                        if(startNode.startsWith('pouvoirMoins'))linkMoins.push(links);
                        links++;
                        linkMoins.push(links);
                    } 
                    */

                    /*ajoute les autres flux
                    if(r['jdc:jdc:flux']){
                        graphCode += `
                        item${r['o:id']}[${r['o:title']}]-->aFlux${r['o:id']}{A d'autre flux ?}
                        aFlux${r['o:id']}-->|avant|fluxAvant${r['o:id']}{flux avant}
                        aFlux${r['o:id']}-->|pendant|fluxPendant${r['o:id']}{flux pendant}
                        aFlux${r['o:id']}-->|après|fluxApres${r['o:id']}{flux après}
                        end
                        ${startNode} |${op['o:label']}|item${r['o:id']}                                        
                        `;
                        aFlux.push(`aFlux${r['o:id']}`);
                        fluxAvant.push(`fluxAvant${r['o:id']}`);
                        fluxPendant.push(`fluxPendant${r['o:id']}`);
                        fluxApres.push(`fluxApres${r['o:id']}`);
                        links++;
                        linkPlus.push(links);
                        links++;
                        linkPlus.push(links);
                        links++;
                        linkMoins.push(links);
                        links++;
                        linkPlus.push(links);
                        links++;
                        linkPlus.push(links);
                        //create fail event
                        createPulsationSubgraph(r,'jdc:flux','fluxAvant'+r['o:id']+'-->',niv+1);
                        //create valid event
                        createPulsationSubgraph(r,'jdc:flux','fluxApres'+r['o:id']+'-->',niv+1);
                    }else{
                        graphCode += `
                        item${r['o:id']}[${r['o:title']}]
                        end
                        ${startNode} |${op['o:label']}|item${r['o:id']}                                        
                        item${r['o:id']} --> |Pas de flux|rtEnd                                        
                        `;
                        links++;
                        if(startNode.startsWith('pulsations'))linkPlus.push(links);
                        if(startNode.startsWith('pouvoirPlus'))linkPlus.push(links);
                        if(startNode.startsWith('pouvoirMoins'))linkMoins.push(links);
                        links++;
                        linkMoins.push(links);
                    } 
                    */

                }
            })
            graphCode += `
                item${rs[rs.length-1].o['o:id']}-->|plus de flux|rtEnd                                       
            `;

        }

        this.init();
    }
}
