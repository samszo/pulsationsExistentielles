import anime from './anime.es.js';        
import {amazelogo} from './amazelogo.js';        
import {cartoHexa} from './cartoHexa.js';        
import * as hl from './hex-lib.js';
import * as ha from './hex-algorithms.js';
import {loader} from './loader.js';
import {Treeselect} from './treeselectjs.mjs.js'
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import {posiColor} from './posiColor.js';


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
        this.posCol=false;
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
            fluxPlus=[], fluxMoins=[],estBon=[],linkPlus=[],linkMoins=[],
            aFlux=[], fluxAvant=[], fluxPendant=[], fluxApres=[],
            nivFluxMax=10, minIntensite=0, maxIntensite=1,links=[],items=[],classMermaid=[];

        this.init = function () {
            console.log('init rt');
            mermaid.initialize({ startOnLoad: false,theme: 'dark', });
            //ajoute le pack d'icones
            mermaid.registerIconPacks([
                {
                  name: 'fa',
                  loader: () =>
                    fetch('https://unpkg.com/@iconify-json/fa@1/icons.json').then((res) => res.json())
                },
              ]);

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
                me.infosRT.append("div").attr('id',"legendeRT");
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
                //ajoute le bouton de photo
                let btnTof=me.navbar.append("li").attr("class","d-flex").append("button").attr("class","btn btn-outline-success");
                btnTof.append("i").attr("class","fa-solid fa-camera");
                btnTof.on('click',function(){
                    me.savePng();
                })                    
            }            
            //Chargment des sources                
            d3.json(me.sources).then(data => {
                let options=data, jsonS=[],optUrl = [];
                data.forEach((s,i) => {
                    if(s.url){
                        jsonS.push(d3.json(s.url))
                        optUrl.push(i);
                    };
                    if(s.children){
                        s.children.forEach(c=>{
                            me.raisonstrajectives.push({'id':c.value,'o':c,'pulsations':[]});
                        });
                    }
                });
                Promise.all(jsonS).then((valuesOmk) => {
                    let jsonOwner=[], optUrlRT = [];
                    valuesOmk.forEach((optionData,j)=>{
                        optionData.forEach(ds=>{
                            //récupère le propriétaire
                            jsonOwner.push(me.omk.getOwner(ds["o:owner"]["o:id"]));
                        })
                    });
                    Promise.all(jsonOwner).then((valuesOwner) => {
                        valuesOmk.forEach((optionData,j)=>{
                            optionData.forEach(ds=>{
                                ds.owner=valuesOwner.shift();
                                optUrlRT.push({'source':optUrl[j],'owner':ds.owner['o:name'],'o':ds});
                            });
                        });
    
                        //regroupe les raisons par sources et owner
                        let sourcesOwnersRT = d3.group(optUrlRT, rt => rt.source, rt => rt.owner);
                        //création des options pour le treeselect
                        sourcesOwnersRT.forEach((owners,source)=>{
                            let numOwner = 0;
                            owners.forEach((rt,owner)=>{
                                let childs = [];
                                rt.forEach(ds=>{
                                    let id = 'omk_'+ds.o['o:id'];
                                    me.raisonstrajectives.push({'id':id,'o':ds.o,'pulsations':[]});            
                                    childs.push({name: ds.o['o:title'],value:id,children: []});
                                });
                                options[source].children.push({name: owner,value:'owner_'+numOwner,children: childs}); 
                                numOwner++;
                            });
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

        function initPosiColor(min, max){
            //calcul les intervales d'intensité
            me.posCol = new posiColor({'data':[{'lib':'intensité','valMin':min,'valMax':max}],'cont':me.infosRT.select("#legendeRT")
                ,'pVal':'valMax','pValMin':'valMin','pLib':'lib', 'frequency':false
                ,'color':d3.interpolateTurbo
                ,'width':me.infosRT.select("#legendeRT").node().getBoundingClientRect().width
                ,'height':60});          
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
            me.infosRT.select("#auteurRT").text(me.rt[0].o.owner['o:name'])
                .append("span").text(" ("+me.rt[0].o["o:modified"]["@value"].split("T")[0]+")");
            //initialise les dimensions existentielles
            me.rt[0].o.physiques = [];
            me.rt[0].o.cribles = [];
            me.rt[0].o.actants = [];
            me.rt[0].o.concepts = [];
            //montyre les pulsations existentielles
            showPulsationsExistentielles(me.rt[0].o,"jdc:hasPulsationExistentielle",me.infosRT.select("#detailsPulEx"));
        }

        function showPulsationsExistentielles(oSource, prop, contPE, nivFlux=0){
            let erreurs = [], rsPE = oSource[prop];
            if(rsPE){
                //ordonne les pulsations par ordre dans le flux
                let pulExFlux = rsPE.filter(p=>{
                        if(p["@annotation"] && p["@annotation"][nivFlux ? "dcterms:temporal" : "jdc:flux"])return true
                        else{
                            erreurs.push({'message':"Dans la "+(nivFlux ? "pulsation existentielle" : "raison trajective")+" :"
                                +"<p class='fw-bold'>"+oSource["o:title"]+"</p>"
                                +(nivFlux ? "la temporalité du flux" : "L'ordre de la pulsation existentielle :")
                                +"<p class='fw-bold'>"+p.display_title+"</p>"
                                +(nivFlux ? "n'est pas définie." : "n'est pas précisé.")
                                ,'link': me.omk.getAdminLink(null,oSource["o:id"],"o:Item")});                            
                            return false
                        }
                    }),
                    pulEx = pulExFlux.sort((a, b) => a["@annotation"][nivFlux ? "dcterms:temporal" : "jdc:flux"][0]["@value"] - b["@annotation"][nivFlux ? "dcterms:temporal" : "jdc:flux"][0]["@value"]),
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
                        cl += p["@annotation"] && p["@annotation"][nivFlux ? "dcterms:temporal" : "jdc:flux"] ? "success" : "danger";
                        cl += " rounded-pill";
                        return cl;
                        }) 
                    .text(p=>{
                        if(p["@annotation"] && p["@annotation"][nivFlux ? "dcterms:temporal" : "jdc:flux"])
                            return p["@annotation"][nivFlux ? "dcterms:temporal" : "jdc:flux"][0][nivFlux ? "display_title" : "@value"]
                        else{
                            erreurs.push({'message':"Dans la pulsation existentielle :"
                                +"<p class='fw-bold'>"+p.display_title+"</p>"
                                +(nivFlux ? "la temporalité du flux" : "L'ordre de la pulsation existentielle :")
                                +(nivFlux ? "n'est pas définie." : "n'est pas précisé.")
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
                                    //récupère l'item omk
                                    po.o = me.omk.getItem(po.value_resource_id);
                                    let intensite = po.o["jdc:intensite"] ? parseInt(po.o["jdc:intensite"][0]["@value"]) : 0;
                                    //compile les dimensions existentielles
                                    if(po.o["jdc:hasPhysique"])po.o["jdc:hasPhysique"].forEach((poDE,i)=>{
                                        me.rt[0].o.physiques.push({'id':poDE.value_resource_id ? poDE.value_resource_id : 'txt_'+po.value_resource_id+'_'+i,'lib':poDE.display_title ? poDE.display_title : poDE["@value"]});
                                    });
                                    if(po.o["jdc:hasCrible"])po.o["jdc:hasCrible"].forEach((poDE,i)=>{
                                        me.rt[0].o.cribles.push({'id':poDE.value_resource_id ? poDE.value_resource_id : 'txt_'+po.value_resource_id+'_'+i,'lib':poDE.display_title ? poDE.display_title : poDE["@value"]});
                                    });
                                    if(po.o["jdc:hasActant"])po.o["jdc:hasActant"].forEach((poDE,i)=>{
                                        me.rt[0].o.actants.push({'id':poDE.value_resource_id ? poDE.value_resource_id : 'txt_'+po.value_resource_id+'_'+i,'lib':poDE.display_title ? poDE.display_title : poDE["@value"]});
                                    });
                                    if(po.o["jdc:hasConcept"])po.o["jdc:hasConcept"].forEach((poDE,i)=>{
                                        me.rt[0].o.concepts.push({'id':poDE.value_resource_id ? poDE.value_resource_id : 'txt_'+po.value_resource_id+'_'+i,'lib':poDE.display_title ? poDE.display_title : poDE["@value"]});
                                    });
                                    //met à jour les intervalles d'intensité
                                    if(intensite>maxIntensite)maxIntensite=intensite;
                                    if(intensite<minIntensite)minIntensite=intensite;
                                    pouvoirs.push({'pe':pe,'po':po.o});
                                }else erreurs.push({'message':"Dans la pulsation existentielle :<br>"
                                        +pe.o['o:title']+"<br>"
                                        +"Le pouvoir :<br>"
                                        +po["@value"]+" : n'est pas un item.",'link': me.omk.getAdminLink(null,pe.o['o:id'],"o:Item")});
                            });
                        }
                        return pouvoirs;
                    }).enter().append('li')
                        //.attr("class","list-group-item d-flex justify-content-between align-items-start");
                        .attr("class","list-group-item"),
                    divPouv = liPouv.append('div').attr('class','d-flex align-items-start justify-content-between'),
                    divPouvIntensite = liPouv.append('div').attr('class','d-flex justify-content-between align-items-center mt-1'),
                    ulPouvProps = liPouv.append('ul').attr("class","list-group mt-2");

                //calcule la légende des intensités    
                if(nivFlux==0)initPosiColor(minIntensite, maxIntensite);
                //calcule l'échelle de positionnment
                let widthIntensite = 20, 
                    widthPou = liPouv.size() ? liPouv.node().getBoundingClientRect().width : 0, 
                    scaleIntensite = d3.scaleLinear().domain([minIntensite,maxIntensite])
                        .range([0,widthPou-widthIntensite*2]);

                //ajoute l'intensité du pouvoir
                divPouvIntensite.append('span')
                    .attr("class","text-bg-light p-1")
                    .style("width",widthIntensite+"px")
                    .style("font-size","xx-small")
                    .style("left",p=>scaleIntensite(p.po["jdc:intensite"] ? parseInt(p.po["jdc:intensite"][0]["@value"]) : 0)+"px")
                    .style("position","absolute")
                    .text(p=>p.po["jdc:intensite"] ? p.po["jdc:intensite"][0]["@value"] : "?");
                divPouvIntensite.append('div')
                    .attr("class","d-flex justify-content-center")
                    .style("height","10px")
                    .style("width",(widthPou-widthIntensite*2)+"px")
                    .style("background-color",p=>{
                        if(p.po["jdc:intensite"])return me.posCol.getColor('intensité',parseInt(p.po["jdc:intensite"][0]["@value"]));
                        else{
                            erreurs.push({'message':"Dans la pulsation existentielle :"
                                +"<p class='fw-bold'>"+p.pe["o:title"]+"</p>"
                                +"L'intensité du pouvoir de :"
                                +"<p class='fw-bold'>"+p.po["o:title"]+"</p>"
                                +"n'est pas précisée.",'link': me.omk.getAdminLink(null,p.po["o:id"],"o:Item")});                            
                            return "black";
                        } 

                    });
                divPouv.append('div')
                        .attr("class","ms-2 me-auto")
                        .append('div')
                            .attr("class","fw-light text-start")
                            .text(p=>p.po['o:title']);
                divPouv.append('span')
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
                divPouv.append('a')
                    .attr("class","badge") 
                    .attr('href',p=>{
                        return me.omk.getAdminLink(null,p.po['o:id'],"o:Item")
                    }).attr('target',"_blank")
                    .append('img').attr('src','assets/img/OmekaS.png')
                        .style("margin-top","-4px")
                        .style("height","20px");

                //ajoute les propriétés du pouvoir
                let propsPouv = {'Discerner': ["jdc:hasPhysique","jdc:hasCrible","jdc:hasActant","jdc:hasConcept"],
                                'Raisonner': ["jdc:hasActant","jdc:hasConcept"],
                                'Résonner': ["jdc:hasActant","jdc:hasConcept"],
                                'Agir': ["jdc:hasConcept","jdc:hasActant","jdc:hasCrible","jdc:hasPhysique"]
                            };
                ulPouvProps.selectAll("li").data(p=>{
                        p.po.props = [];
                        if(p.po["dcterms:type"]){
                            propsPouv[p.po["dcterms:type"][0].display_title].forEach(prop=>{
                                if(p.po[prop]){
                                    p.po[prop].forEach(pp=>{
                                        p.po.props.push({'p':p,'prop':prop,'v':pp.display_title ? pp.display_title : pp["@value"]});
                                    });
                                }else{
                                    erreurs.push({'message':"Dans la pulsation existentielle :"
                                        +"<p class='fw-bold'>"+p.pe["o:title"]+"</p>"
                                        +"Le pouvoir de :"
                                        +"<p class='fw-bold'>"+p.po["o:title"]+"</p>"
                                        +"n'a pas de propriété :"
                                        +"<p class='fw-bold'>"+prop+"</p>.",'link': me.omk.getAdminLink(null,p.po["o:id"],"o:Item")});
                                }
                            });
                        }
                        return p.po.props;   
                    }).enter().append('li').attr("class","list-group-item text-start fw-lighter")
                        .text(p=>me.omk.getPropByTerm(p.prop)["o:label"]+" : "+p.v)

                //création des flux associés
                let divPeFlux = liPE.append('div')
                    .attr("class","row")                    
                    .append('ul').attr("id",p=>"fluxPE"+p.value_resource_id).attr("class","list-group mt-1 ms-3");
                divPeFlux.each((p,i)=>{
                    if(nivFluxMax > nivFlux)showPulsationsExistentielles(p.o,"jdc:flux",d3.select("#fluxPE"+p.value_resource_id),nivFlux+1);
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
            if(nivFlux==0){
                //TODO: mets à jour les couleurs
                me.createDiagram();
            }
            me.loader.hide(true);
        }


        function purgeIHM(){
            me.rt=[];
            me.timelines.forEach(tm=>tm.remove());
            me.timelines=[];
            me.playRaisonTrajective('cacheModele');
            me.infosRT.select("#detailsPulEx").selectAll("li").remove();
            me.infosRT.select("#titreRT").text("Veuillez sélectionner une raison trajective");
            me.infosRT.select("#legendeRT").html("");
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
            classMermaid={},
            aFlux=[], fluxAvant=[], fluxPendant=[], fluxApres=[];
            clearMermaid();
            let oRT = me.rt[0].o, niv = 0, rtId = "raisonTrajective"+oRT['o:id'];
            classMermaid.StartEnd={'code':'fill:green,stroke:white,stroke-width:8px','ids':[rtId,'rtEnd']};

            graphCode = `
            %%{
                init: {
                  'theme': 'neutral'
                }
            }%%
            flowchart TD
            `;
            
            //create raison trajective
            if(oRT['o:title'] && oRT["jdc:hasPulsationExistentielle"]){
                graphCode += `
                    ${rtId}[${oRT['o:title']}];
                `;
                //création des dimensions existentielles
                /*
                graphCode += `
                subgraph sgDimExi[Dimensions existentielles];
                `;
                */                                                
                [{'k':'physiques','cDeb':'(','cFin':')'},
                 {'k':'cribles','cDeb':'[[','cFin':']]'},
                 {'k':'actants','cDeb':'{{','cFin':'}}'},
                 {'k':'concepts','cDeb':'((','cFin':'))'}].forEach(de=>{
                    graphCode += `
                    subgraph sg${de.k}[${de.k == 'cribles' ? de.k : 'Dimensions '+de.k}];
                    `;                                                
                    let grDE = d3.group(oRT[de.k], d => d.lib);
                    grDE.forEach((v,k)=>{
                        graphCode += `${de.k+v[0].id+de.cDeb+k+de.cFin}
                        `;
                    });
                    if(de.k=='cribles'){
                        graphCode += `end
                            end
                        `;
                    }else if(de.k!='physiques'){
                        graphCode += `end
                        `;
                    }

                })
                /*fin groupe dimensions existentielles
                graphCode += `end
                `;
                */
                //ajoute les liens
                //links.push({'code':`${rtId} --> sgDimExi`});
                links.push({'code':`sgphysiques --> sgactants`});
                links.push({'code':`sgactants --> sgconcepts`});
                //links.push({'code':`rtEnd --> ${rtId}`});
                
                //create flow for each pulsation existentielles dans l'odre défini
                //ordonne les pulsations par ordre dans le flux
                let pulExFlux = oRT["jdc:hasPulsationExistentielle"].filter(p=>p["@annotation"] && p["@annotation"]["jdc:flux"]),
                    pulEx = pulExFlux.sort((a, b) => a["@annotation"]["jdc:flux"][0]["@value"] - b["@annotation"]["jdc:flux"][0]["@value"]);
                //createPulsationSubgraph(pulEx,rtId,niv);
                createPulsationPower(pulEx,rtId,niv);
            }else{
                graphCode += `
                    raisonTrajective[Start] -->pulsations{Pas de pulsations existentielles};
                    pulsations --> rtEnd[Fin du flux]
                    `;
            }

            //ajoute les liens
            links.forEach(l=>{
                graphCode += `${l.code}
                    `;
            });
            /*ajoute les classes d'objet            
            for (const k in classMermaid) {
                graphCode += `
                classDef ${k} ${classMermaid[k].code}                
                `;
                if(classMermaid[k].ids.length){
                    graphCode+= `class ${classMermaid[k].ids.join(',')} ${k};
                    `;
                }
            };
            */
            //ajoute les class de liens
            let grpColor = d3.group(links, d => d.color);
            grpColor.forEach((v,k)=>{
                if(k){  
                    graphCode += `
                    linkStyle ${v.map(l=>l.num).join(",")} stroke:${d3.color(k).formatHex()},stroke-width:4px;    
                    `;
                }
            });
            
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
        function createPulsationPower(rs,startNode,niv){
            //ajoute les pulsations existentielles sous la forme de lien entre les dimension existentielles
            rs.forEach((vr,j)=>{
                if(!vr.o)return true;
                let numFlux = vr["@annotation"] && vr["@annotation"]["jdc:flux"] ? vr["@annotation"]["jdc:flux"][0]["@value"] : "???",
                    temps = vr["@annotation"]["dcterms:temporal"] ? vr["@annotation"]["dcterms:temporal"][0].display_title : vr["@annotation"]["jdc:flux"][0]["@value"];
                links.push({'code':`${startNode}-->|${temps}|PE_${vr.o['o:id']}[${vr.o['o:title']}] 
                    `});        
                //ajoute les pouvoirs
                if(vr.o['jdc:hasPouvoir']){
                    let grpPouvoir = d3.group(vr.o["jdc:hasPouvoir"], d => d.o["dcterms:type"][0].display_title);
                    
                    grpPouvoir.forEach((v,k)=>{ 
                        console.log(k,v);
                        if(k=="Discerner" || k=="Raisonner")return true;
                        v.forEach((p,i)=>{
                            let intst = p.o["jdc:intensite"] ? parseInt(p.o["jdc:intensite"][0]["@value"]) : 0,
                                color = me.posCol.getColor('intensité',intst),
                                idLink = `PE_${vr.o['o:id']}_PO_${k}_${intst}`, link,
                                linkExist = links.filter(l=>l.id==idLink).length;
                            if(!linkExist){
                                link = {'num':links.length,'id':idLink,'int':intst,'color':color};
                                links.animate = `${link.id}@{ animate: true}
                                `;
                                link.code = `PE_${vr.o['o:id']} ${link.id}@==> PO_${k}${niv==0 && j==0 ? '@{icon: "fa:bolt", form: "square", label: "'+k+'", pos: "t", h: 60 }' : ''}
                                ${link.id}@{ animate: true }
                                `;
                                links.push(link);
                            }
                            link = {'num':links.length,'id':`${k}PO_${p.value_resource_id}`,'int':intst,'color':color};
                            linkExist = links.filter(l=>l.id==link.id).length;
                            if(!linkExist){                            
                                links.animate = `${link.id}@{ animate: true}
                                `;
                                link.code = `PO_${k} ${link.id}@==> PO_${p.value_resource_id}@{shape: paper-tape, label: "${p.display_title}"} 
                                ${link.id}@{ animate: true }
                                `;
                                links.push(link);
                            }
                            switch (k) {
                                case "Discerner":
                                    //pouvoir -> physique
                                    let idsPhys = addPowerLinkDimEx(p,p.value_resource_id,'PO_','physiques',"jdc:hasPhysique",intst,color);
                                    idsPhys.forEach((idPhy,i)=>{
                                        if(p.o["jdc:hasCrible"]){
                                            //physique -> crible
                                            let idsCrible = addPowerLinkDimEx(p,idPhy,'physiques','cribles',"jdc:hasCrible",intst,color);
                                            idsCrible.forEach((idCrible,i)=>{
                                                //crible -> actant                                            
                                                let idsActant = addPowerLinkDimEx(p,idCrible,'cribles','actants',"jdc:hasActant",intst,color);
                                                idsActant.forEach((idActant,i)=>{
                                                    //actant -> concept
                                                    let idsCpt = addPowerLinkDimEx(p,idActant,'actants','concepts',"jdc:hasConcept",intst,color);                                                
                                                });
                                            });
                                        }
                                    });                                                
                                    break;                        
                                case "Raisonner":
                                    //pouvoir -> actant                                            
                                    let idsActant = addPowerLinkDimEx(p,p.value_resource_id,'PO_','actants',"jdc:hasActant",intst,color);
                                    idsActant.forEach((idActant,i)=>{
                                        //actant -> concept
                                        let idsCpt = addPowerLinkDimEx(p,idActant,'actants','concepts',"jdc:hasConcept",intst,color);                                                
                                    });
                                    break;                        
                                case "Agir":
                                    //pouvoir -> concept
                                    let idsCpt = addPowerLinkDimEx(p,p.value_resource_id,'PO_','concepts',"jdc:hasConcept",intst,color);                                                                                            
                                    idsCpt.forEach((idActant,i)=>{
                                        //concept -> actant
                                        let idsActant = addPowerLinkDimEx(p,p.value_resource_id,'PO_','actants',"jdc:hasActant",intst,color);
                                        idsActant.forEach((idActant,i)=>{
                                            //actant -> crible
                                            let idsCrible = addPowerLinkDimEx(p,idActant,'actants','cribles',"jdc:hasCrible",intst,color);
                                            idsCrible.forEach((idCrible,i)=>{
                                                //crible -> physique
                                                let idsPhys = addPowerLinkDimEx(p,idCrible,'cribles','physiques',"jdc:hasPhysique",intst,color);
                                            });
                                        });
                                    });
                                    break;          
                                default:
                                    break;
                            }
                        });
                    });                              
                }
                //ajoute les pulsations existentielles liées avant, pendant et après
                if(vr.o['jdc:flux'] && niv < 2){
                    createPulsationPower(vr.o['jdc:flux'],`PE_${vr.o['o:id']}`,niv+1);
                }
            });
        }

        function createPulsationSubgraph(rs,startNode,niv){
            graphCode += `
            subgraph sgPE[Pulsations existentielles]
            `;
            rs.forEach((vr,j)=>{
                //if(j>0)return true;
                //check if node exist
                let numFlux = vr["@annotation"] && vr["@annotation"]["jdc:flux"] ? vr["@annotation"]["jdc:flux"][0]["@value"] : "???";
                graphCode += `
                subgraph sgPE${vr.o['o:id']}[ ]
                    PE_${vr.o['o:id']}[${vr.o['o:title']}]
                `;
                //ajoute les pouvoirs
                if(vr.o['jdc:hasPouvoir']){
                    let grpPouvoir = d3.group(vr.o["jdc:hasPouvoir"], d => d.o["dcterms:type"][0].display_title);
                    
                    grpPouvoir.forEach((v,k)=>{ 
                        console.log(k,v);

                        graphCode += `
                        subgraph sgPo${k+"_"+vr.o['o:id']}[${k}]
                        `;
                        v.forEach((p,i)=>{
                            graphCode += `
                            PO_${p.value_resource_id}@{ icon: "fa:bolt", form: "square", label: "${p.display_title}", pos: "t", h: 60 }
                            `;
                            let intst = p.o["jdc:intensite"] ? parseInt(p.o["jdc:intensite"][0]["@value"]) : 0,
                                color = me.posCol.getColor('intensité',intst);

                            //ajoute les liens pouvoirs -> dimensions existentielles
                            /*
                            if(p.o["jdc:hasPhysique"])p.o["jdc:hasPhysique"].forEach((poPhy,i)=>{
                                let idPhy = me.rt[0].o.physiques.filter(fv=>fv.lib==(poPhy.value_resource_id ? poPhy.display_title : poPhy["@value"]))[0].id;
                                */
                            if(p.o["jdc:hasPhysique"]){
                                //pouvoir -> physique
                                let idsPhys = addPowerLinkDimEx(p,p.value_resource_id,'PO_','physiques',"jdc:hasPhysique",intst,color);                                                
                                idsPhys.forEach((idPhy,i)=>{
                                    if(p.o["jdc:hasCrible"]){
                                        //physique -> crible
                                        let idsCrible = addPowerLinkDimEx(p,idPhy,'physiques','cribles',"jdc:hasCrible",intst,color);
                                        idsCrible.forEach((idCrible,i)=>{
                                            //crible -> actant                                            
                                            let idsActant = addPowerLinkDimEx(p,idCrible,'cribles','actants',"jdc:hasActant",intst,color);
                                            idsActant.forEach((idActant,i)=>{
                                                //actant -> pouvoir
                                                let idLink = `linkActPO_${idActant}_${p.value_resource_id}`,
                                                link = {'num':links.length,'id':idLink,'int':intst,'color':color};
                                                links.animate = `${idLink}@{ animate:true}
                                                `;
                                                link.code = `actants${idActant} ${idLink}@==> PO_${p.value_resource_id}
                                                ${idLink}@{ animate: true }
                                                `;
                                                links.push(link);
                                                //pouvoir -> concept
                                                let idsCpt = addPowerLinkDimEx(p,p.value_resource_id,'PO_','concepts',"jdc:hasConcept",intst,color);                                                
                                            });
                                        });
                                    }else{
                                        addPowerLinkDimEx(p,idPhy,'physiques','actants',"jdc:hasActant",intst,color);
                                    }
                                });
                            }
                        })
                        graphCode += `
                        end
                        `;
                        /*pas de lien entre la pulsation et tous les pouvoirs
                        links.push({'code':`PE_${vr.o['o:id']}-->| |sgPo${k+"_"+vr.o['o:id']} 
                            `});
                            */
                    })
                }
                graphCode += `
                end
                `;

                if(j>0){
                    let numFluxPrev = rs[j-1]["@annotation"] && rs[j-1]["@annotation"]["jdc:flux"] ? rs[j-1]["@annotation"]["jdc:flux"][0]["@value"] : "???";
                    /* Pas de lien entre les pulsations
                    links.push({'code':`PE_${rs[j-1].o['o:id']}-->|${numFluxPrev+' -> '+numFlux}|PE_${vr.o['o:id']} 
                        `});
                    */
                }else{
                    links.push({'code':`PE_${vr.o['o:id']}-->| |sgPo${"Discerner_"+vr.o['o:id']}
                        `});
                    links.push({'code':`sgPo${"Discerner_"+vr.o['o:id']}-->| |sgPo${"Raisonner_"+vr.o['o:id']}
                        `});
                    links.push({'code':`sgPo${"Raisonner_"+vr.o['o:id']}-->| |sgPo${"Agir_"+vr.o['o:id']}
                        `});
                    links.push({'code':`sgPo${"Agir_"+vr.o['o:id']}-->| |PE_${vr.o['o:id']}
                        `});
                }
                
            })
            graphCode += `
            end
            `;
            links.push({'code':`${startNode} --> | |sgPE 
                `});
    

            /*
            links.push({'code':`PE_${rs[rs.length-1].o['o:id']}-->|plus de flux|rtEnd
                `});
            */
        }

        function addPowerLinkDimEx(p,idStart,dimStart,dimEnd,prop,intst,color){
            let idsProp = [];
            if(p.o[prop])p.o[prop].forEach((poProp,i)=>{
                let idProp = me.rt[0].o[dimEnd].filter(fv=>fv.lib==(poProp.value_resource_id ? poProp.display_title : poProp["@value"]))[0].id,
                idLink = `linkPO_${p.value_resource_id}_${idStart}_${idProp}`,
                link = {'num':links.length,'id':idLink,'int':intst,'color':color};
                links.animate = `${idLink}@{ animate: true}
                `;
                link.code = `${dimStart+idStart} ${idLink}@==> ${dimEnd+idProp}
                ${idLink}@{ animate: true }
                `;
                //vérifie si le lien existe déjà
                let isExist = links.filter(l=>l.id==idLink);
                if(!isExist.length){
                    links.push(link);
                    idsProp.push(idProp);    
                }
            });        
            return idsProp;
        }

        this.savePng = function(){
            let svg = d3.select("#mermaidGraph").select('svg').node();
            exportSvgToPng(svg, 'pulsationExistentielle.png');
        }

        function exportSvgToPng(svgElement, fileName) {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            const image = new Image();
            image.onload = () => {
                const bb = svgElement.getBoundingClientRect();
                const width = bb.width*100;
                const height = bb.height*100;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0, width, height);
                URL.revokeObjectURL(url);

                canvas.toBlob(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }, 'image/png');
            };
            image.src = url;
        }

        this.init();
    }
}
