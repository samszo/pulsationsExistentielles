//un grand merci à https://www.redblobgames.com/grids/hexagons/
import * as points from './cartoPoints.js';
import * as hl from './hex-lib.js';
import * as ha from './hex-algorithms.js';
import {modal} from './modal.js';
import { tree } from './tree.js'

export class cartoHexa {
    constructor(params) {
        var me = this;
        this.noInit = params.noInit ? params.noInit : false;
        this.dataCarte = params.dataCarte ? params.dataCarte : false;
        this.omk = params.omk ? params.omk : false;
        this.showLoader = params.showLoader ? params.showLoader : false;        
        this.hideLoader = params.hideLoader ? params.hideLoader : false;        
        this.data = params.data ? params.data : {
            "o:id": 1,"o:title": "Carte exemple", "children":[
                {"o:id": 11,"o:title": "vide", "value":1, "children":[
                    {"o:id": 111,"o:title": "encore vide", "value":1}
                    ,{"o:id": 112,"o:title": "toujours plein","value":1}
            ]}
                ,{"o:id": 12,"o:title": "plein","value":10}
        ]};
        this.cont = d3.select("#"+params.idCont);
        this.fontSize = params.fontSize ? params.fontSize : 1;
        this.id = params.id ? params.id : 'ch0';
        this.planExtent = params.planExtent ? params.planExtent : 1;
        this.eventCreate = params.eventCreate ? params.eventCreate : 'click';
        this.eventDetails = params.eventDetails ? params.eventDetails : 'click';
        this.eventDetailsCooccurrence = params.eventDetailsCooccurrence ? params.eventDetailsCooccurrence : 'click';
        this.cp = points;
        let layoutBase, padding = 0, width, height, legende,
        svg, rectBase, container, hierarchie, defText="vide", allHexa=[], takenHexa=[], color, defColor='#102040'
        , patience, defValSelect, valueExtent, resourceClass=false
        , onDrag=false, onZoom=false, onAdd=false, onRedim = false
        , subShapeDetail=2
        , p = d3.path(), svgHexa
        , rapportMin=1, rapportMax=1, rapportWidth
        //relation entre la direction Geo et Hex Flat cf. Hex.directions in hex-lib.js
        //ATTENTION il n'y a pas de e ni de w car orientation flat
        , hexGeoDir = {'n':2,'ne':1,'se':0,'s':5,'sw':4,'nw':3}
        , m=new modal(), mChangeConcept, mAddCrible, sgtConcept, sltConcept, conceptVide
        , sltRelations, skosRelations = {'name':0,'term':'skos:semanticRelation', 'o:id':0,'children': [
                {'name':0,'term':'skos:narrowerTransitive', 'o:id':0,'children': [
                    {'name':0,'term':'skos:narrower', 'o:id':0,'children': [
                        {'name':0,'term':'skos:narrowMatch', 'o:id':0,'children': []}        
                    ]}    
                ]},
                {'name':0,'term':'skos:broaderTransitive', 'o:id':0,'children': [
                    {'name':0,'term':'skos:broader', 'o:id':0,'children': [
                        {'name':0,'term':'skos:broadMatch', 'o:id':0,'children': []}        
                    ]}    
                ]},
                {'name':0,'term':'skos:related', 'o:id':0,'children': [
                    {'name':0,'term':'skos:relatedMatch', 'o:id':0,'children': []}    
                ]},
                {'name':0,'term':'skos:mappingRelation', 'o:id':0,'children': [
                    {'name':0,'term':'skos:closeMatch', 'o:id':0,'children': [
                        {'name':0,'term':'skos:exactMatch', 'o:id':0,'children': []}        
                    ]},
                    {'name':0,'term':'skos:relatedMatch', 'o:id':0,'children': []},    
                    {'name':0,'term':'skos:broadMatch', 'o:id':0,'children': []},    
                    {'name':0,'term':'skos:narrowMatch', 'o:id':0,'children': []},    
                ]},
            ]}
        , urlDataCarte = me.omk ? me.omk.api.replace('api/','s/cartoaffect/page/ajax?json=1&helper=CartoHexa&action=getCarte&id=') : false; 

        this.init = function () {
            
            if(me.noInit)return;

            me.showLoader();

            initSuggest();
            initSkosRelations();

            //initialisation
            this.cont.selectAll('div').remove();
            this.cont.selectAll('h1').remove();
            let rectCont = this.cont.node().getBoundingClientRect(), 
            
            //création du div pour le titre
            divTitre = this.cont.append('h1').attr('id','divCartoHexaTitre'+me.id).text('Titre de la carte'),
            rectTitre = divTitre.node().getBoundingClientRect(),
            //création du div pour la carte
            divCarto = this.cont.append('div').attr('id','divCarto'+me.id)
                .style('height',(rectCont.height-rectTitre.height)+'px').style('width','100%').style('float','left'),
            rectCarto = divCarto.node().getBoundingClientRect(); 
            /*création du div pour la légende  
            legende = this.cont.append('div').attr('id','divLeg'+me.id)
                .style('height',rectCont.height+'px').style('width','30%')
                .style('background-color','white').style('float','left')
            */
            //création du svg pour la carto
            width = parseInt(rectCarto.width);
            height = parseInt(rectCarto.height);    
            svg = divCarto.append('svg')
                .attr('id','svgCartoHexa'+me.id)
                .attr('width',width).attr('height',height),
            container = svg.append("g");
            svg.call(
                d3.zoom()
                    //.scaleExtent([.1, planExtent])
                    .on('zoom', (event) => {
                        container.attr('transform', event.transform);
                        })                        
            );

            //ajoute les data
            if(me.urlData){
                d3.json(me.urlData).then(function(data) {
                    me.data = data;
                    setData();
                });            
            }else{
                setData();
            } 
            me.hideLoader();

        };

    this.setLayout=function(){
        layoutBase = new hl.Layout(hl.Layout.flat,new hl.Point(100, 100), new hl.Point(0, 0));
        return layoutBase;
    }

    function setData() {
        if(!me.dataCarte && me.omk){
            //nouvelle carte
            newCarte();
        }else if(me.dataCarte && me.omk){
            //chargement d'une carte omk
            getDataCarte();
        }else{
            //chargeemnt de la carte par défaut
            initData();
        }
    }

    function getDataCarte(){
        showLoader();
        d3.json(urlDataCarte+me.dataCarte['o:id']).then(data=>{
            me.data = data; 
            initData();
            hideLoader();
        });
    }

    function newCarte(){
        showLoader();
        const start = new Date(Date.now());
        const titre = " de "+me.omk.user["o:name"]+" le "+start.toISOString();
        //création d'une nouvelle carte
        me.omk.createRessource({
            "o:resource_template":"CartoHexa", 
            "o:resource_class":"jdc:CribleCarto", 
            "dcterms:title":"CartoHexa"+titre, 
            "dcterms:description":'Write your description'
        },
        carte=>{
            console.log(carte);
            me.dataCarte = carte; 
            newCrible(false,false,c=>{
                showOmkDetails(null, carte)
                getDataCarte();                
                hideLoader();    
            })
        });
    }

    function newCrible(hexa, r, fct){
        if(!r && !conceptVide){
            r = conceptVide=me.omk.searchItems("property[0][joiner]=and&property[0][property][]=1&property[0][type]=eq&property[0][text]=Vide"
                +"&resource_class_id[]="+me.omk.getClassByName("Concept")['o:id'])[0];
        }
        if(!hexa)hexa={'q':0,'r':0,'s':0};
        //création d'un nouveau crible
        let dataCrible = {
            "o:resource_template":"Crible", 
            "o:resource_class":"jdc:Crible", 
            "dcterms:title":"Crible "+hexa.q+"_"+hexa.r+"_"+hexa.s+" pour "+me.dataCarte['o:title'], 
            "dcterms:description":'Ecrire votre description',
            "dcterms:type":{'rid':r['o:id']},
            "jdc:hexaQ":hexa.q.toString(),
            "jdc:hexaR":hexa.r.toString(),
            "jdc:hexaS":hexa.s.toString(),
        };
        if(r.idCrible){
            r.relations.forEach(rela=>{
                dataCrible[rela.t]=rela.v;
            })
        }else dataCrible["jdc:hasCribleCarto"]={'rid':me.dataCarte['o:id']}
        me.omk.createRessource(dataCrible,
        crible=>{
            /*
            if(r.idCrible){
                //met à jour le crible parent
                me.omk.updateRessource(r.idCrible,{"jdc:hasCrible":{'rid':crible['o:id']}}
                ,'items',null,'PATCH',rs=>{
                    console.log(rs);
                })        
            }
            */
            console.log(crible);
            fct(crible);
        });

    }
        
    function initData() {
        hierarchie = d3.hierarchy(me.data);
        resourceClass = hierarchie.data['o:resource_class'];

        //définition des intervales
        valueExtent = d3.extent(me.data.children.map(d=>d.value));

        //définition des couleurs    
        color = d3.scaleSequential().domain(valueExtent).interpolator(d3.interpolateCool)

        //layout toujours flat pour garder un coté en relation avec le parent
        layoutBase = new hl.Layout(hl.Layout.flat,
            new hl.Point(100, 100), new hl.Point(0, 0))
        
        //initialise la cartographie suivant le nombre d'élément
        initGrille(me.planExtent);           
        addTitle(hierarchie);

        //création de la légende
        if(legende)createLegende();
        else addChildren(hierarchie,valueExtent)

    }


    function ExceptionCartoHexa(message) {
        this.message = message;
        this.name = "ExceptionCartoHexa";
     }    

     function createLegende() {

        let pad = 10;
        legende.append('h1').text('Légende').style('padding',pad+'px');
        
        createBrushVal();

        //ajoute la liste des docs
        let lr = legende.append('div').attr('id',me.id+'ListeResource').style('padding',pad+'px');
        lr.append('h2').text("Liste des ressources");
        
    }

    function showListeDoc(d){
        let lr = d3.select('#'+me.id+'ListeResource');
        lr.selectAll('h3').remove();
        lr.append('h3').html('Cooccurences entre <i>'+d.source.title+'</i> et <i>'+d.title+'</i>');
        lr.selectAll('ul').remove();
        let lis = lr.append('ul').selectAll('li').data(d.items).enter().append('li').text(d=>d['o:title'])
        if(me.urlItemDetails){
            lis.append('a')
                .style('margin-left','3px')
                .attr('target','_blank')
                .attr('href',l=>me.urlItemDetails+l['o:id']).text('->')
        }
    }

    function createBrushVal(){
        let margin = ({top: 20, right: 20, bottom: 30, left: 40})
        , data = d3.sort(Array.from(d3.group(me.data.children, d => d.value)).map(d=>{ return {'nb': d[1].length,'value':d[0]};}), d => d.value)
        , nbExtent = d3.extent(data, d=>d.nb)
        , rect = legende.node().getBoundingClientRect()
        , height=200 
        , focusHeight=height 
        , area = (x, y) => d3.area()
            .x(d => x(d.value))
            .y0(y(0.9))
            .y1(d => y(d.nb))
        /*
        , x = d3.scaleLinear()
            .domain(valueExtent)
            .range([margin.left, rect.width - margin.right])
        */
        , x = d3.scaleLog().base(2).domain(valueExtent).range([margin.left, rect.width - margin.right])
        , xAxis = (g, x, height, title) => g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .call(g => g.selectAll(".title").data([title]).join("text")
                .attr("class", "title")
                .attr("x", margin.left)
                .attr("y", margin.bottom)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text(title))            
        /*
        , y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.nb)])
            .range([height - margin.bottom, margin.top])
        */
        , y = d3.scaleLog().base(2).domain([0.9,nbExtent[1]]).range([height - margin.bottom, margin.top])
        , yAxis = (g, y, title) => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(d3.min([4,y.domain()[1]])))
            .call(g => g.selectAll(".title").data([title]).join("text")
                .attr("class", "title")
                .attr("x", 0)
                .attr("y", 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "middle")
                .text(title));

        const svg = legende.append("svg")
            .attr("viewBox", [0, 0, rect.width, height])
            .style("display", "block");
        const brush = d3.brushX()
            .extent([[margin.left, 0.5], [rect.width - margin.right, focusHeight - margin.bottom + 0.5]])
            .on("brush", brushed)
            .on("end", brushended);
        /*la sélection par défaut correspond à une étendu de 100
        let deb = valueExtent[1] > 100 ? valueExtent[1]/2-50 : valueExtent[0], 
            fin = valueExtent[1] > 100 ? valueExtent[1]/2+50 : valueExtent[1];        
        */
        //la sélection par défaut correspond à 1/4 des valeurs les plus grandes
        let sumNb = d3.sum(data, d=>d.nb)
            , deb = data[parseInt(data.length/4)].value
            , fin = valueExtent[1];        
        defValSelect = {'v':[deb, fin],'x':[x(deb), x(fin)]};

        svg.append('defs').append("linearGradient")
            .attr("id", "gradValue")
            //.attr("gradientUnits", "userSpaceOnUse")
            //.attr("x1", 0).attr("y1", 0)
            //.attr("x2", 0).attr("y2", 1)
        .selectAll("stop")
            .data(data.map((d,i)=>{return {'offset':(i*100/data.length)+"%", 'color': color(d.value)}}))
        .enter().append("stop")
            .attr("offset", function(d) { return d.offset; })
            .attr("stop-color", function(d) { return d.color; });

        svg.append("g")
            .call(xAxis, x, height,"Nombre d'usage de l'hexa");
        svg.append("g")
            .call(yAxis, y, 'nb Hexa');
        
        svg.append("path")
            .datum(data)
            .attr("fill", "url(#gradValue)")
            .attr("d", area(x, y));
        
        const gb = svg.append("g")
            .call(brush)
            .call(brush.move, defValSelect.x);
        
        function brushed({selection}) {
            if (selection) {
                let s = selection.map(x.invert, x);
                container.selectAll('.gInitPlanOccupe').attr('visibility',h=>{
                    if(!h.data)return 'visible';
                    return h.data.value >= s[0] && h.data.value <= s[1] ? 'visible' : 'hidden'
                });
            }
        }
        
        function brushended({selection}) {
            if (!selection) {
                gb.call(brush.move, defValSelect.x);
            }else{
                let s = selection.map(x.invert, x);
                container.style("cursor", "wait");
                addChildren(hierarchie,s);
                container.style("cursor", "default");
            }
        }

    }
    this.hexCenter = function(hexa, layout) {
        return hexCenter(hexa, layout);
    }
    function hexCenter(hexa, layout) {        
        let p = layout.hexToPixel(hexa),
        x = p.x, 
        y = p.y;
        return {
            'x': x,
            'y': y,
            transform: `translate(${x},${y})`,
            points:[x,y]
        }
    }
    this.getViewBox=function(hexas){
        return getViewBox(hexas);
    }
    function getViewBox(hexas) {
        let rect = ha.hexSetBounds(layoutBase, hexas),
        left = rect.left - padding,
        top = rect.top - padding,
        width = rect.right - rect.left + 2 * padding,
        height = rect.bottom - rect.top + 2 * padding;
        return [left, top, width, height];
    }
    //création de la grille vide
    function initGrille(nbShape, update){
        let contTrans = container.attr('transform');
        container.attr('transform','');

        while (allHexa.length < hierarchie.children.length) {
            allHexa = ha.makeHexagonalShape(nbShape);
            nbShape ++;
        }
        //ajoute un shape pour l'extension
        allHexa = ha.makeHexagonalShape(nbShape);
        nbShape ++;
        me.planExtent = nbShape;
        let polygonVerticesFlat = layoutBase
            .polygonCorners(new hl.Hex(0,0,0))
            .map(p=>`${p.x},${p.y}`)
            .join(" "),            
        vb = getViewBox(allHexa),
        scale = 1;
        if(update){
            svgHexa = container.select('#'+me.id+'svgE');
            //traite uniquement les hexa sans data
            allHexa = allHexa.filter(h=>{
                if(h.q == 0 && h.s == 0 && h.r == 0)return false; 
                if(takenHexa[me.id+'_hexa_0_'+h.toString().replaceAll(',','_')])return false;
                return true;
            })    
        }else{
            svgHexa = container.append('svg')
                .attr('id',me.id+'svgE');
            //ajouter les markers pour les rapports
            let markerBoxWidth = 20
                , markerBoxHeight = 20
                , refX = markerBoxWidth/2
                , refY = markerBoxHeight/2
                , arrowPoints = [[0, 0], [0, 20], [20, 10]]
                , defs = svgHexa.append('defs');
            defs.append('marker')
                .attr('id', 'arrow')
                .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
                .attr('refX', refX)
                .attr('refY', refY)
                .attr('markerWidth', markerBoxWidth)
                .attr('markerHeight', markerBoxHeight)
                .attr('orient', 'auto-start-reverse')
                .append('path')
                .attr('d', d3.line()(arrowPoints))
                .attr('fill', '#ffffff32');        
            defs.append('marker')
                .attr('id', 'point')
                .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
                .attr('refX', refX)
                .attr('refY', refY)
                .attr('markerWidth', markerBoxWidth)
                .attr('markerHeight', markerBoxHeight)
                .attr('orient', 'auto')
                .append('circle')
                .attr('r', refX/2).attr('cx', refX).attr('cy', refY)
                .attr('fill', '#ffffff32');        
        }
        svgHexa.attr('viewBox',vb.join(' '));
        let gHexa = svgHexa.selectAll('.gInit').data(allHexa)
        .join(
            enter => enter.append('g')
                .attr('class',g=>'gInit'+(g.idCpt ? ' cpt'+g.idCpt : ''))
                .attr('id',(h,i)=>{
                    h.layout = layoutBase;
                    h.subShapeDetail = subShapeDetail;
                    h.depth = 0;
                    h.id = me.id+'_hexa_'+h.depth+'_'+h.q+'_'+h.r+'_'+h.s;
                    return h.id;
                })
                .attr('transform',h=>hexCenter(h,layoutBase).transform)
                .on(me.eventCreate,addNewEspace)
                .append('polygon').attr('points',polygonVerticesFlat)
                .attr('fill',defColor).attr('stroke','#a8acaf')                
            ,
            update => update
                .attr('id',(h,i)=>{
                    h.layout = layoutBase;
                    h.subShapeDetail = subShapeDetail;
                    h.depth = 0;
                    h.id = me.id+'_hexa_'+h.depth+'_'+h.q+','+h.r+','+h.s;
                    return h.id;
                })
                .attr('class',g=>'gInit'+(g.idCpt ? ' cpt'+g.idCpt : ''))
                .attr('transform',h=>hexCenter(h,layoutBase).transform)
            /*    ,
            exit => exit
                .remove()
            */
          );
        //place en front les hexas occupés
        d3.selectAll('.formeSpe').raise();
        d3.selectAll('.gHexa').raise();         
        container.attr('transform',contTrans);
                
        return svgHexa;
    }
    //ajoute le titre de la carte
    function addTitle(d){

        d3.select('#divCartoHexaTitre'+me.id).text(d.data['o:title'] ? d.data['o:title'] : defText)
            .style('cursor', 'help')
            .on(me.eventDetails,function(){showOmkDetails(null,d.data)});
    }
    //ajoute les enfants d'une resource
    function addChildren(p,s){
        if(!p.children)return;
        p.children.forEach(c=>{
            //vérifie que les données sont dans la sélection
            if(c.data.value >= s[0] && c.data.value <= s[1]){ 
                addChild(c);
            }
        })
    }
    function addChild(c, move){
        //vérifie si on place le concept à l'intérieur
        if(move){
            c.depth++;
            //création de l'hexa
            addHexa(null,c);
            d3.select('#'+idO).remove();            
            d3.select('#'+c.id).raise();
            takenHexa[idO]=false;
        }else{
            //récupération de l'espace parent
            
            //création de l'espace
            addEspace(null,c);
        }
        return c;        
    }


    function getPosiHexa(r){
        /*
        ATTENTION l'identifiant pour être unique est lié à :
        - la position dans la carte = profondeur + place dans la grille
        - l'identifiant de la resource parente
        */
        let hexa=new hl.Hex(
            parseInt(r.data["jdc:hexaQ"][0]["@value"]),
            parseInt(r.data["jdc:hexaR"][0]["@value"]),
            parseInt(r.data["jdc:hexaS"][0]["@value"])
            );
        return setHexaProp(hexa, r);
    }


    function getNextHexa(r){
        /*
        ATTENTION l'identifiant pour être unique est lié à :
        - la position dans la carte = profondeur + place dans la grille
        - l'identifiant de la resource parente
        */
        let e=false, i=1;
        while (!e) {
            //récupère la première place disponible du centre vers l'extérieur
            ha.hexRing(i).every(hexa=>{       
                e = setHexaProp(hexa, r);                
                if(e.id){
                    return false;
                }
                return true
            })
            if(i > me.planExtent){
                //ajoute les hexas supplémentaires pour la grille
                initGrille(me.planExtent+1,true);                
            }
            i++;
        }
        return e;
    }
    function setHexaProp(hexa,r){
        let e = {}, idHexa = r.id ? r.id : me.id;
        idHexa += '_hexa_'+(r.depth-1)+'_'+hexa.toString().replaceAll(',','_');                
        if(!takenHexa[idHexa]){                
            e.r = r;
            e.color = getColor(r);
            e.id = idHexa.replace('_hexa_'+(r.depth-1),'_hexa_'+r.depth)+'_'+r.data['o:id'];
            e.idEspace = me.id+'_espace_'+r.data['o:id']+(r.data.concept ? '_'+r.data.concept['o:id'] : '');
            e.idHexa = idHexa;
            e.idCrible = r.data['o:id'];
            e.idCpt = r.data.concept ? r.data.concept['o:id'] : false;
            e.idText = 'eText'+e.idEspace;
            e.depth = r.depth;
            e.title = r.data.concept ? r.data.concept['o:title'] : r.data['o:title'];
            e.subShapeDetail = subShapeDetail;
            e.grille = makeGrille(e.subShapeDetail,e);
            e.layoutOut = r.layout ? r.layout : layoutBase;
            e.polygonOut = e.layoutOut
                .polygonCorners(new hl.Hex(0,0,0))
                .map(p=>`${p.x},${p.y}`)
                .join(" ");            
            e.layoutIn = new hl.Layout(hl.Layout.flat, new hl.Point(e.layoutOut.size.x/(e.subShapeDetail*2+1), e.layoutOut.size.y/(e.subShapeDetail*2+1)), new hl.Point(0, 0));
            e.polygonIn = e.layoutIn
                .polygonCorners(new hl.Hex(0,0,0))
                .map(p=>`${p.x},${p.y}`)
                .join(" ");
            e.Hex = hexa;
            e.center = hexCenter(hexa, e.layoutOut);
            e.bord=true;
            takenHexa[e.idHexa]=e;
            d3.select('#'+e.idHexa).attr('class','gOccupe');
            return e;
        } return false;
    }
    function updateHexaProp(d,newConcept){
        let dt = d.idEspace ? d : d.r;  
        dt.r.data["dcterms:type"][0]['value_resource_id']=newConcept['o:id'];
        dt.r.data["dcterms:type"][0]['url']=dt.r.data["dcterms:type"][0]['url'].replace(dt.idCpt,newConcept['o:id']);
        dt.r.data["dcterms:type"][0]['url']=dt.r.data["dcterms:type"][0]['display_title']=newConcept['o:title'];
        dt.r.data["dcterms:type"][0]['url']=dt.r.data["dcterms:type"][0]['@id'].replace(dt.idCpt,newConcept['o:id']);
        dt.concept=newConcept;
        dt.idEspace = dt.idEspace.replace(dt.idCpt,newConcept['o:id']);
        dt.idCpt = newConcept['o:id'];
        dt.title = newConcept['o:title'];
        dt.idText = 'eText'+dt.idEspace;
        dt.grille = makeGrille(dt.subShapeDetail,dt);    
    }

    function makeGrille(N,rs) {
        let results = [];
        for (let q = -N; q <= N; q++) {
            for (let r = -N; r <= N; r++) {
                let hexa = new hl.Hex(q, r, -q-r);
                if (hexa.len() <= N) {
                    results.push({'r':rs,'hexa':hexa});
                }
            }
        }
        return results;
    }
    
    function addNewEspace(e,h){
        sltConcept = false;
        showAddCrible(h, (ev,d)=>{
            if(!sltConcept)return;
            //construction des données du crible
            let dataCrible = {
                'o:id':sltConcept['o:id'],
                'idCrible':h.r.idCrible,
                'relations':[]                
            }
            mAddCrible.s.selectAll('.selectNode').each(d=>{
                dataCrible.relations.push({'t':d.data.term,'v':{'rid':dataCrible.idCrible}});
            })
            newCrible(h.hexa, dataCrible, (crible)=>{
                let r = {
                    "height": 0,
                    "id":h.id,
                    "data":{
                        "o:id": crible['o:id'],
                        "o:title": sltConcept['o:title'],
                        "value": -1,
                        "children": [],
                        "concept":sltConcept    
                    }
                };
                if(h.hexa){
                    r.depth  = h.depth+1;
                    r.layout = h.r.layoutIn;
                    r.hexas=[setHexaProp(h.hexa,r)];
                }else{
                    r.hexas=[setHexaProp(h,r)];
                }    
                addEspace(e.currentTarget,r);
                mAddCrible.m.hide();
            })            
        })
    }

    //pour une ressource ajoute un espace qui sera composé d'une collection d'hexa
    //ATTENTION il n'y a qu'un seul espace pour une ressource
    function addEspace(c,r){
        //si la ressource n'a pas d'hexa on en crée un 
        if(!r.hexas){
            if(r.data && r.data["jdc:hexaQ"]
                && r.data["jdc:hexaQ"][0]["@value"]
                && r.data["jdc:hexaR"][0]["@value"]
                && r.data["jdc:hexaS"][0]["@value"]){
                r.hexas = [getPosiHexa(r)];
            }else  r.hexas = [getNextHexa(r)];
        }
        //définition du conteneur
        let cont = c ? d3.select(d3.select(c).node().closest(".gHexa")):svgHexa;
        if(!cont.size())cont = svgHexa;
        if(cont.attr('id')==me.id+'_espace_'+r.data['o:id'])cont = svgHexa;        
        //creation de l'espace
        let espace = cont.selectAll('#'+me.id+'_espace_'+r.data['o:id']).data([r])
        .join(
            enter => {
                //le centre est réserver à la description de l'espace
                enter.append('g')
                    .attr('id',e=>{
                        e.color = getColor(e)
                        e.id = me.id+'_espace_'+e.data['o:id'];
                        return e.id
                    })
                    .attr('class','gEspace')
                    .style('cursor', 'grab')
                    .call(d3.drag()
                        .on("start", dragEspaceStart)
                        .on("drag", dragEspace)
                        .on("end", dragEspaceEnd)
                        .filter(event => !onZoom && !onAdd && !onRedim)
                        //.on("start.update drag.update end.update", dragEspaceUpdate)
                    )
                    .call(addEspaceHexas);
                    //création des enfants
                    addChildren(r,[0,me.data.children.length]);        
                },
            update => {
                update.call(addEspaceHexas);
                },
            exit => {
                exit.remove();
            }
        );
    }
    function addEspaceHexas(e){
        e.selectAll(".gHexa").data(d=>{
            return d.hexas; 
        })
        .join(
            enter => {
                enter.append('g')
                .attr('id',(h,i)=>{
                    h.id = h.idEspace+'_hexa_'+i;
                    return h.id
                })
                .attr('class',h=>{
                    return 'gHexa'+(h.idCpt ? ' cpt'+h.idCpt : '');
                })
                .attr('transform',(h)=>{
                    return h.center.transform
                    })
                .call(addHexasGrille)
                .call(addHexaForme)
                .call(addHexaText);        
            },        
            update => {
                update.attr('class',h=>{
                    return 'gHexa update'+(h.idCpt ? ' cpt'+h.idCpt : '');
                });
                update.select('text').attr('id',h=>h.r.idText).text(h=>h.title);        
            },
            exit => {
                exit.remove();
            }
        );
    }

    function addHexaText(e){
        //le centre est réserver à la description de l'espace
        e.append("text")
            .attr('id',h=>h.idText)
            .attr('class','eText')
            .attr('text-anchor','middle')
            .attr('alignment-baseline',"middle")
            .text(h=>h.title)
            .attr("font-size", adaptLabelFontSize)
            .style('cursor', 'help')
            .attr('transform','scale(10)')
            .attr('fill','white')
            .on("mouseenter", zoomHexa)            
            .on(me.eventDetails ,getDetails);        
                
    }
    function addHexaForme(e){
        //construction de la forme spécifique
        switch (resourceClass) {
            case "jdc:Concept":
            case "skos:Concept":
            case "Cartographie d'un crible":
                    return addHexaConcept(e);                
                break;        
            default:
                return false;
        }        
    }

    function addHexaConcept(e){

        //construction des formes intérieurs
        let bord;
        e.append('path')
            .attr('class',h=>'inForme eForme depth'+h.r.depth)
            .attr('fill',h=>{
                return h.r.color
            })
            .attr('d',h=>{
                h.rInscrit = h.layoutOut.size.x*Math.sqrt(3)/2;//rayon du cercle inscrit
                bord = h.bord;
                return "M" + 0 + "," + 0 + " " +
                        "m" + -h.rInscrit + ", 0 " +
                        "a" + h.rInscrit + "," + h.rInscrit + " 0 1,0 " + h.rInscrit*2  + ",0 " +
                        "a" + h.rInscrit + "," + h.rInscrit + " 0 1,0 " + -h.rInscrit*2 + ",0Z";
            })
            .attr('stroke','black').attr('stroke-width',h=>1/h.depth/10)
            ; 
        //remonte la grille intérieur pour activer les événements
        e.selectAll('.gInit').raise();
        /*
        construction du bord 
        pour redimensionner
        uniquement si précisé
        */
        if(bord){
            bord = e.append('path')
                .attr('id',h=>h.id+'_bord')
                .attr('class',h=>'bordForme eForme depth'+h.r.depth)
                .attr('fill','none')
                .attr('stroke',h=>{
                    h.colorBord = d3.color(h.color).copy({opacity: 0.6});
                    return h.colorBord
                })
                .on('mousemove',(e,h)=>{
                    //calcul l'angle pour le cursor = la courbe à modifier
                    let p = d3.pointer(e);
                    h.cursor = getAngleCursor([0,0],p);
                    d3.select(e.currentTarget).style('cursor',h.cursor);
                })
                .attr('d',h=>{
                    h.espace = d3.select(d3.select('#'+h.id).node().closest(".gEspace"))
                    if(h.pointsBezier)return svgBezierOvalRedim(h);
                    return svgBezierCircle(h);
                })
                .attr('stroke-linecap',"round")
                .attr('stroke-width',h=>h.wBord)                
                .on("mouseenter", dezoomHexa)
                .on("mouseleave", zoomHexa);
            bord.call(d3.drag()
                //.subject(s)
                .on("start", redimEspaceStart)
                .on("drag", redimEspace)
                .on("end", redimEspaceEnd)            
                .on("start.update drag.update end.update", redimEspaceUpdate)
                //.filter(event => !onZoom && !onAdd)
                );
        }

    }

    function addHexasGrille(e){
        e.append('polygon').attr('points',h=>h.polygonOut)
            .attr('fill',h=>h.color)
            .attr('stroke','black')
            .attr('stroke-width',h=>1/h.depth/10)
            .attr('class','eHexaOut');
        //construction des grilles intérieurs
        let gHexaGrille = e.selectAll('.gInit').data(r=>r.grille).enter().append('g')
            .attr('class',g=>'gInit'+(g.r.idCpt ? ' cpt'+g.r.idCpt : ''))
            .attr('id',(g,i)=>{
                g.center = hexCenter(g.hexa, g.r.layoutIn);
                g.depth = g.r.depth+1;
                g.id = g.r.id+'_'+g.depth+'_'+g.hexa.toString().replaceAll(',','_');    
                return g.id;
            })
            .attr('transform',g=>{
                return g.center.transform
            });
        gHexaGrille.append('polygon').attr('points',g=>g.r.polygonIn)
            .attr('fill',g=>g.r.color)
            .attr('stroke',resourceClass ? 'white' : 'black')
            .attr('stroke-width',g=>1/g.depth/10)
            .style('cursor', g=>{
                g.cursor = getCursor(g.hexa);
                return g.cursor;
            })
            .on("mouseenter", dezoomHexa)
            .on('click',clickHexa);                
    }
    function getColor(r){
        let c = r.data ? r.data.value==-1 ? 'white' : color(r.data.value) : 'white';
        if(r.hexa && r.hexa.toString() == '0,0,0') h.color = d3.color(c).copy({opacity: resourceClass ? 0.01 : 0.8});
        else r.color = d3.color(c).copy({opacity: resourceClass ? 0.1 : 0.5});
        return r.color
    }
    //ajoute un hexagone
    function addHexa(e,hp){
        if(hp.q == 0 && hp.s == 0 && hp.r == 0)return;
        let s = svg.select('#'+hp.id).clone(true);
        hp.id = 'hexa'+hp.id;        
        if(takenHexa[hp.id])return;

        let hexas = ha.makeHexagonalShape(hp.subShapeDetail),
        layout = new hl.Layout(hl.Layout.flat, new hl.Point(hp.layout.size.x/(hp.subShapeDetail*2+1), hp.layout.size.y/(hp.subShapeDetail*2+1)), new hl.Point(0, 0)),
        polygonVerticesFlat = layout
            .polygonCorners(new hl.Hex(0,0,0))
            .map(p=>`${p.x},${p.y}`)
            .join(" "),            
        sClass = s.attr('class'),
        //ajoute la forme spécifique
        formSpe = addFormeSpe(e, s, hp),    

        //ajoute la grille hexagonale
        gHexa = s.selectAll('.gHexa').data(hexas).enter().append('g')
            .attr('class',h=>{
                h.depth = e ? hp.depth+1 : hp.depth;//gestion ajout manuel ou data
                return 'gHexa depth'+h.depth
            })
            .attr('id',(h,i)=>{
                h.data = hp.data;
                h.center = hexCenter(h, layout);
                h.subShapeDetail = hp.subShapeDetail;
                h.layout =layout;                
                h.id = hp.id+'gPlan'+h.depth+'_'+h.q+'_'+h.r+'_'+h.s;    
                return h.id;
            })
            .attr('transform',h=>{
                return h.center.transform
            })
            .on("mouseenter", zoomHexa)
            .on("mouseleave", dezoomHexa)
            ,
        polys = gHexa.append('polygon').attr('points',polygonVerticesFlat)
            .attr('fill',h=>{
                let c = h.data ? color(h.data.value) : 'white';
                if(h.q == 0 && h.s == 0 && h.r == 0) h.color = d3.color(c).copy({opacity: resourceClass ? 0.01 : 0.8});
                else h.color = d3.color(c).copy({opacity: resourceClass ? 0.01 : 0.5});
                return h.color
            })
            .attr('stroke',resourceClass ? 'white' : 'black')
            .attr('stroke-width',h=>1/h.depth/10)
            .style('cursor', h=>{
                h.espace = s;
                h.cursor = getCursor(h);
                return h.cursor;
            })
            .on("mouseenter", dezoomHexa)
            .on("mouseleave", function(){onAdd=false;})
            .on('click',clickHexa);
        //ajoute le drag & drop sur l'hexa
        s.attr('id',hp.id)
            .attr('class',sClass=='gInitPlan' ? 
                hp.hexSource ? 'gInitPlanOccupe linkWith'+hp.hexSource.data['o:id'] : 'gInitPlanOccupe'  
                : sClass+' gInitPlanOccupe')
            .style('cursor', 'grab')
            .data(hp).call(d3.drag()
                .on("start", dragEspaceStart)
                .on("drag", dragEspace)
                .on("end", dragEspaceEnd)
                .filter(event => !onZoom && !onAdd && !onRedim)
                //.on("start.update drag.update end.update", dragEspaceUpdate)
                );                        

        //le centre est réserver à la description de l'espace
        //ajoute les titres
        gHexa.append("text")
            .attr('id',h=>{
                if(h.q == 0 && h.s == 0 && h.r == 0){
                    h.title = hp.title ? hp.title : defText; 
                    h.title = hp.hexSource ? hp.hexSource.title : h.title;
                } else h.title = "";
                return 'chText_'+h.id
            })
            /*
            .selectAll("tspan")
            .data(d => d.title.split(/(?=[A-Z][a-z])|\s+/g))
            .join("tspan")
            .attr("x", 0)
            .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
            */
            .attr('text-anchor','middle')
            .attr('alignment-baseline',"middle")
            .text(h=>h.title)
            .attr("font-size", adaptLabelFontSize)
            .style('cursor', 'help')
            .on("mouseenter", zoomHexa)
            .on(me.eventDetails ,getDetails)
            ;

        takenHexa[hp.id]=gHexa;

    }
    function getCursor(h){
        let d = h.distance({q:0,s:0,r:0});
        switch (d) {
            case 0://au centre
                return 'pointer';
                break;
            case 1://à l'intérieur
                return 'zoom-in';
                break;        
            case 2://au bord
                return 'none'//pris en charge par la formeSpe
                if(h.q==0 && h.s==2 && h.r==-2)return 'n-resize';
                if(h.q==2 && h.s==-1 && h.r==-1)return 'e-resize';
                if(h.q==0 && h.s==-2 && h.r==2)return 's-resize';
                if(h.q==-2 && h.s==1 && h.r==1)return 'w-resize';
                if(h.q==1 && h.s==1 && h.r==-2)return 'ne-resize';
                if(h.q==2 && h.s==0 && h.r==-2)return 'ne-resize';
                if(h.q==-1 && h.s==2 && h.r==-1)return 'nw-resize';
                if(h.q==-2 && h.s==2 && h.r==0)return 'nw-resize';
                if(h.q==2 && h.s==-2 && h.r==0)return 'se-resize';
                if(h.q==1 && h.s==-2 && h.r==1)return 'se-resize';
                if(h.q==-1 && h.s==-1 && h.r==2)return 'sw-resize';
                if(h.q==-2 && h.s==0 && h.r==2)return 'sw-resize';
                break;
        }
    }
    function addFormeSpe(e, s,hp){
        switch (resourceClass) {
            case "jdc:Concept":
                return addConcept(e, s,hp);                
                break;        
            default:
                return false;
        }
    }
    function addConcept(e, s, hp){
        let forme;
        if(hp.hexSource){
            forme = svg.select('#'+hp.hexSource.id).select('.formeSpe.depth'+ (e ?  hp.depth+1 : hp.depth));
            //fussionne les deux courbes
            let fusion = fusionNeighbors(hp.hexSource, hp)
            //ajoute l'intérieur au nouveau hexa
            s.selectAll('circle').data([hp]).enter().append('g')
                .attr('class',h=>'formeSpe depth'+ (e ?  h.depth+1 : h.depth))     
                .append('path')
                .attr('class','inForme')
                .attr('fill',hp.hexSource.color)
                .attr('d',h=>{
                    let r = h.hexSource.rInscrit;
                    //
                    return "M" + 0 + "," + 0 + " " +
                            "m" + -r + ", 0 " +
                            "a" + r + "," + r + " 0 1,0 " + r*2  + ",0 " +
                            "a" + r + "," + r + " 0 1,0 " + -r*2 + ",0Z";
                })
                .attr('stroke','black').attr('stroke-width',1/hp.depth/10)
                ; 
            //met à jour la courbe de l'hexa source
            hp.hexSource.pointsBezier = fusion[1]; 
            forme.select('.bordForme').raise().attr("d", svgBezierOvalRedim(hp.hexSource));            
        }else{
            forme = s.selectAll('circle').data([hp]).enter().append('g')
            .attr('class',h=>'formeSpe depth'+ (e ?  h.depth+1 : h.depth));
            /*ajoute le cercle inscrit pour l'intérieur'
            forme.append('circle')
                .attr('fill',h=>{
                    let c = h.data ? color(h.data.value) : 'white';
                    h.color = d3.color(c).copy({opacity: 0.8});
                    return h.color
                })
                .attr('cx',0)
                .attr('cy',0)
                .attr('r',h=>h.layout.size.x*Math.sqrt(3)/2)//rayon du cercle inscrit
                .attr('stroke','black').attr('stroke-width',h=>1/h.depth/10); 
            */    
            forme.append('path')
                .attr('class','inForme')
                .attr('fill',h=>{
                    let c = h.data ? color(h.data.value) : 'white';
                    h.color = d3.color(c).copy({opacity: 0.8});
                    return h.color
                })
                .attr('d',h=>{
                    let r = h.layout.size.x*Math.sqrt(3)/2;//rayon du cercle inscrit
                    h.rInscrit = r;
                    //
                    return "M" + 0 + "," + 0 + " " +
                            "m" + -r + ", 0 " +
                            "a" + r + "," + r + " 0 1,0 " + r*2  + ",0 " +
                            "a" + r + "," + r + " 0 1,0 " + -r*2 + ",0Z";
                })
                .attr('stroke','black').attr('stroke-width',h=>1/h.depth/10)
                ; 
            
            //ajoute le bord pour redimensionner
            let bord = forme.append('path')
                .attr('class','bordForme')
                .attr('fill','none')
                .attr('stroke',h=>{
                    h.hexa = new hl.Hex(h.q,h.r,h.s);
                    let c = h.data ? color(h.data.value) : 'white';
                    h.colorBord = d3.color(c).copy({opacity: 1});
                    return h.colorBord
                })
                .on('mousemove',(e,h)=>{
                    //calcul l'angle pour le cursor = la courbe à modifier
                    let p = d3.pointer(e);
                    h.cursor = getAngleCursor([0,0],p);
                    d3.select(e.currentTarget).style('cursor',h.cursor);
                })
                .attr('d',h=>{
                    return svgBezierCircle(h);
                })
                .attr('stroke-linecap',"round")
                .attr('stroke-width',h=>h.wBord);
            bord.call(d3.drag()
                //.subject(s)
                .on("start", redimEspaceStart)
                .on("drag", redimEspace)
                .on("end", redimEspaceEnd)            
                .on("start.update drag.update end.update", redimEspaceUpdate)
                //.filter(event => !onZoom && !onAdd)
                );
        }
        //
        return forme;
    }


    function fusionNeighbors(hS, hT){

        let d, n, bp={
            'se':svgBezierOvalQuarter(hS.centerX, hS.centerY, -hS.rBord, -hS.rBord),
            'sw':svgBezierOvalQuarter(hS.centerX, hS.centerY, hS.rBord, -hS.rBord),
            'ne':svgBezierOvalQuarter(hS.centerX, hS.centerY, -hS.rBord, hS.rBord),
            'nw':svgBezierOvalQuarter(hS.centerX, hS.centerY, hS.rBord, hS.rBord)
        },neighbors={"c":"","hexas":{}};                

        //calcule les beziers du nouvelle hexa
        svgBezierCircle(hT);

        /* on recherche les voisins du nouveau hexa        
        */
        for (const g in hexGeoDir) {
            d=hexGeoDir[g];
            n = hT.hexa.neighbor(d);
            hS.r.hexas.forEach((nh)=>{
                if(n.toString()==nh.hexa.toString()){
                    neighbors.c+=g+','; 
                    neighbors.hexas[g]=nh;
                }
            });
        }
        neighbors.c = neighbors.c.substring(0,neighbors.c.length-1);
        console.log(neighbors.c);
        //modification des points suivant la combinaison des voisins
        if(me.cp.hexaFusion[neighbors.c])
            fusionPoints(hT,neighbors,me.cp.hexaFusion[neighbors.c],bp);
        else
            console.log('combinaison non gérée : '+neighbors.c);
    }

    function fusionPoints(t,n,p,bp){
        p.forEach(p=>{
            let h = p.nh ? n.hexas[p.nh]:t,
                pH = h.layoutOut.polygonCorners(h.hexa);
            p.cp.forEach(d=>{
                let arr=[], dp;
                if(typeof d !== 'object' && d.substring(0,9)=='getPoints'){
                    let params = d.split('_');
                    dp = params[0]=='getPointsLiaison' ?
                        me.cp.getPointsLiaison(params[1])
                        : me.cp.getPointsFusion(params[1],params[2],params[3]);
                }else dp = d;
                dp.p.forEach(pt=>{
                    if(pt.bp)
                        arr.push(bp[pt.bp][pt.v])
                    else{
                        arr.push(getFusionCoor(h,pH,pt));
                    }
                })
                changePoints(h,dp,n.c,arr);
            })
            p.dp.forEach(d=>{
                let k = getPointDir(d, h.pointsBezier);
                h.pointsBezier.delete(k);
            });
            d3.select('#'+h.id+'_bord').attr('d',svgBezierOvalRedim(h));                                                    
        });                
    }

    function getFusionCoor(h,pH,pt){
        let x = h.center.x-pH[pt.ph].x,
        y = h.center.y-pH[pt.ph].y;
        x = pt.bx == '-' ? x-h.wBord/2 : pt.bx == '+' ? x+h.wBord/2 : x; 
        y = pt.by == '-' ? y-h.wBord/2 : pt.by == '+' ? y+h.wBord/2 : y; 
        return [x,y]; 
    }

    function changePoints(h,dp,n,p){
        if(h.pointsBezier.has(dp.d+'0')){
            h.pointsBezier.set(dp.d+n,p);
            h.pointsBezier.delete(dp.d+'0');    
        }else if(h.pointsBezier.has(dp.d+'move')){
            //on ne chgange que les points ayant bougé ?
            h.pointsBezier.set(dp.d+n,p);
            h.pointsBezier.delete(dp.d+'move');    
        }else{
            let k = getPointDir(dp.d, h.pointsBezier);
            h.pointsBezier.set(dp.d+n,p);
            h.pointsBezier.delete(k);        
        }
    }

    function getCombinations(valuesArray)
    {    
        var combi = [];
        var temp = [];
        var slent = Math.pow(2, valuesArray.length);
        
        for (var i = 0; i < slent; i++)
        {
            temp = [];
            for (var j = 0; j < valuesArray.length; j++)
            {
                if ((i & Math.pow(2, j)))
                {
                    temp.push(valuesArray[j]);
                }
            }
            if (temp.length > 0)
            {
                combi.push(temp);
            }
        }
        
        combi.sort((a, b) => a.length - b.length);
        console.log(combi.join("\n"));
        return combi;
    }

    //récupère les voisins d'un hexa dans l'intérieur auquel il appartient
    function getNeighborsIn(hexa,hexas){
        let neighbors = [], neighborsIn = [];
        //récupère les voisins de l'hexa
        for (const g in hexGeoDir) {
            neighbors.push({'g':g,'h':hexa.neighbor(hexGeoDir[g])});
        }
        //filtre les hexa présent dans l'étendu
        neighborsIn = hexas.filter(h=>{
            let s = h.hexa.toString(), inForme=false;
            neighbors.forEach(n=>{
                if(n.h.toString()== s){
                    inForme=true;
                    h.g = n.g;
                }
            })
            return inForme;             
        });
        return neighborsIn;
    }

    //merci beaucoup à httpHexa://stackoverflow.com/questions/1734745/how-to-create-circle-with-b%C3%A9zier-curves    
    function svgBezierCircle(h) {
        p = d3.path();
        //rayon du cercle circonscrit de 2 hexa
        //let r = ((h.layout.size.x/(h.subShapeDetail*2+1))*Math.sqrt(3)/2)*4;
        //rayon du cercle inscrit
        //moins la largeur du stroke / 2 cf. https://alexwlchan.net/2021/03/inner-outer-strokes-svg/
        h.wBord = h.layoutOut.size.x/(h.subShapeDetail*2+1);
        h.rInscrit = h.layoutOut.size.x*Math.sqrt(3)/2;//rayon du cercle inscrit
        h.rBord = h.rInscrit-h.wBord/2
        h.centerX = 0;
        h.centerY = 0;
        svgBezierOval(h);
        return p.toString();
    }
    function svgBezierOvalRedim(h) {
        p = d3.path();
        //for (const dir in h.pointsBezier){
        //    let points=h.pointsBezier[dir];
        h.pointsBezier.forEach(points=>{
            p.moveTo(...points[0]);
            p.bezierCurveTo(...points[1],...points[2],...points[3]);    
        });
        return p.toString();
    }
    function svgBezierOval(h) {
        //utilisation d'une map pour garder l'ordre
        h.pointsBezier = new Map();
        h.pointsBezier.set('ne0', svgBezierOvalQuarter(h.centerX, h.centerY, -h.rBord, h.rBord));
        h.pointsBezier.set('se0', svgBezierOvalQuarter(h.centerX, h.centerY, -h.rBord, -h.rBord));
        h.pointsBezier.set('sw0', svgBezierOvalQuarter(h.centerX, h.centerY, h.rBord, -h.rBord));
        h.pointsBezier.set('nw0', svgBezierOvalQuarter(h.centerX, h.centerY, h.rBord, h.rBord));
    }
    function svgBezierOvalQuarter(centerX, centerY, sizeX, sizeY) {
        let points = [
            [centerX - (sizeX), centerY - (0)],
            [centerX - (sizeX), centerY - (0.552 * sizeY)],
            [centerX - (0.552 * sizeX), centerY - (sizeY)],
            [centerX - (0), centerY - (sizeY)]
        ];
        p.moveTo(...points[0]);
        p.bezierCurveTo(...points[1],...points[2],...points[3]);
        return points;
    }

    function dragEspace(e,h){
        d3.select(this).raise().attr("transform",'translate('+(e.x-h.hexas[0].center.x)+','+(e.y-h.hexas[0].center.y)+')')        
    }
    function dragEspaceStart(e,h){        
        onDrag=true;
        hideCooccurrences(h);
        //d3.select(this).selectAll('polygon').attr('stroke','white').attr('stroke-width',h=>1/h.depth);
    }
    function dragEspaceEnd(evt,esp){

        //bouge tous les hexas de l'espace
        let bougeX = 0, bougeY = 0, nh, nc, existHexa;
        esp.hexas.forEach((h,i)=>{
            if(i==0){
                nh = correctPixelHexa({x:(evt.x),y:(evt.y)},h.layoutOut); 
                nc = hexCenter(nh, h.layoutOut);
                bougeX = nc.x-h.center.x;
                bougeY = nc.y-h.center.y;
            }else{
                nh= correctPixelHexa({x:(h.center.x+bougeX),y:(h.center.y+bougeY)},h.layoutOut);
            } 
            //vérifie si l'hexa est occupé
            existHexa = d3.select('#'+me.id+'_hexa_'+(esp.depth-1)+'_'+nh.q+'_'+nh.r+'_'+nh.s);
            //vérifie s'il faut ajouter l'hexa dans un autre hexa
            if(existHexa.size()){
                console.log('hexa occupé');
                /*TODO:gérer
                - intersection : https://www.redblobgames.com/grids/hexagons/#range-intersection
                - obstacle : https://www.redblobgames.com/grids/hexagons/#range-obstacles
                */
                //un parent ne peut pas être enfant ?
            }else{
                //ajoute les hexas supplémentaires pour la grille
                let dst = nh.distance({q:0,r:0,s:0});
                initGrille(dst,true);
            }
            updateEspaceHexaDragEnd(evt,h,nh);    
        })
        d3.select(this)
            .attr("transform","");
            //.attr('stroke','black').attr('stroke-width',h=>1/h.depth/10);
        showCooccurrences(esp);    
        onDrag=false;
    }
    function updateEspaceHexaDragEnd(evt,h,nh) {
        let center = hexCenter(nh, h.layoutOut);
        //libère l'hexa de la grille
        d3.select('#'+h.idHexa).attr('class',g=>'gInit'+(g.idCpt ? ' cpt'+g.idCpt : ''))
        takenHexa[h.idHexa]=false;
        //modifie l'idHexa
        h.idHexa = h.idHexa.replace(h.hexa.toString().replaceAll(',','_'), nh.toString().replaceAll(',','_'));
        //bouge l'hexa
        d3.select('#'+h.id).attr('transform',center.transform)
        //changele center
        h.center = center;
        //change l'hexa
        h.hexa = nh;
        //occupe l'hexa de la grille
        d3.select('#'+h.idHexa).attr('class','gOccupe')
        takenHexa[h.idHexa]=h;
    }

    function dragEspaceUpdate(e,h){
        console.log(h);
    }
    function correctPixelHexa(e,l){
        let nh = l.pixelToHex(e);
        nh.q = Math.round(nh.q); 
        nh.r = Math.round(nh.r); 
        nh.s = Math.round(nh.s);
        let sum = nh.q+nh.r+nh.s;
        if(nh.q+nh.r+nh.s!=0)nh.s = -nh.q - nh.r;
        return nh;
    }
    function getAngleCursor(s,t){
        //merci à https://gist.github.com/conorbuck/2606166
        let a = Math.atan2(t[1]-s[1], t[0]-s[0]) * 180 / Math.PI + 180        
        , pas = 360/16, dir = "";
        if(a<=pas || a>=pas*15)dir = 'w-resize';
        if(a<=pas*3 && a>=pas)dir = 'nw-resize';
        if(a<=pas*5 && a>=pas*3)dir = 'n-resize';
        if(a<=pas*7 && a>=pas*5)dir = 'ne-resize';
        if(a<=pas*9 && a>=pas*7)dir = 'e-resize';
        if(a<=pas*11 && a>=pas*9)dir = 'se-resize';
        if(a<=pas*13 && a>=pas*11)dir = 's-resize';
        if(a<=pas*15 && a>=pas*13)dir = 'sw-resize';
        //console.log(a+' : '+dir);
        return dir; 
    }
    function redimEspaceStart(e,h){        
        let contTrans = container.attr('transform');
        container.attr('transform','');
        onRedim=true;
        h.espace.raise();
        if(!h.pointer)h.pointer = h.layoutOut.hexToPixel(h.hexa);
        hideCooccurrences(h);    
        container.attr('transform',contTrans);
    }
    function redimEspace(e,h){
        let contTrans = container.attr('transform');
        container.attr('transform','');
        let x=e.x, y=e.y, k;
        /*Change les points suivant le cursor
            p.moveTo(...points[0]);
            p.bezierCurveTo(...points[1],...points[2],...points[3]);
        */ 
        console.log('redimEspace : '+h.cursor);
        movePoints(h, me.cp.hexaMove[h.cursor],x,y);
        container.attr('transform',contTrans);
    }
    function movePoints(h, dirs, x, y){
        let k, p;
        dirs.forEach(d=>{
            //on supprime les anciens points pour définir des points move
            k = getPointDir(d.d, h.pointsBezier);
            p = h.pointsBezier.get(k);
            p[d.p][0]=x;
            p[d.p][1]=y;
            h.pointsBezier.delete(k);                                        
            h.pointsBezier.set(d.d+'move',p);                                        
        })
    }

    function getPointDir(dir, points){
        return [...points.keys()].filter(k=>k.substring(0,2)==dir)[0];
    }
    function redimEspaceUpdate(e,h){
        d3.select(this).attr("d", d=>svgBezierOvalRedim(d));
    }
    function redimEspaceEnd(e,h){
        let contTrans = container.attr('transform');
        container.attr('transform','');
        let eh = correctPixelHexa({
                x:e.x+h.pointer.x,
                y:e.y+h.pointer.y
                },h.layoutOut),
        line = h.hexa.linedraw(eh),
        newHexa, prevHexa;
        //vérification avant extension de l'espace à partir du deuxième hexa de la ligne
        for (let i = 1; i < line.length; i++) {
            let nh = line[i];
            //vérifie si l'hexa est occupé
            let existHexa = d3.select('#'+me.id+'_hexa_'+(h.depth-1)+'_'+nh.q+'_'+nh.r+'_'+nh.s);
            if(existHexa.size() && existHexa.attr('class')=="gOccupe"){
                let center = hexCenter(nh, h.layoutOut);
                /*TODO:gérer
                - intersection : https://www.redblobgames.com/grids/hexagons/#range-intersection
                - obstacle : https://www.redblobgames.com/grids/hexagons/#range-obstacles
                */
            }
            //vérification de la création d'un pavage supplémentaire            
            if(!existHexa.size()){
                //ajoute les hexas supplémentaires pour la grille
                let dst = nh.distance({q:0,r:0,s:0});
                initGrille(dst,true);
            }
            //ajoute un hexa à l'espace
            newHexa = setHexaProp(nh,h.r);
            newHexa.espace = h.espace;
            newHexa.hexNumLigne = i;
            newHexa.hexFinLigne = i==line.length-1 ? true : false;
            //newHexa.bord=false;
            //calcul les beziers de la source vers la destination
            fusionNeighbors(i==1 ? h : prevHexa, newHexa);
            h.r.hexas.push(newHexa);
            //calcul les beziers de la destination vers la source
            fusionNeighbors(newHexa, i==1 ? h : prevHexa);
            prevHexa = newHexa;
        }
        //met à jour l'espace avec les nouveaux hexa
        addEspace(null,h.r);
        container.attr('transform',contTrans);
        showCooccurrences(h);    

        onRedim=false;
    }


    function adaptLabelFontSize(h) {
        /*
            * The meaning of the ratio between labelAvailableWidth and labelWidth equaling 1 is that
            * the label is taking up exactly its available space.
            * With the result as `1em` the font remains the same.
            *
            * The meaning of the ratio between labelAvailableWidth and labelWidth equaling 0.5 is that
            * the label is taking up twice its available space.
            * With the result as `0.5em` the font will change to half its original size.
            */
        return (h.layoutIn.size.x / this.getComputedTextLength()) + 'em';
    } 

    function zoomHexa(e,d){ 
        onAdd=false;
        let idText = d.idText ? d.idText : d.r.idText;        
        d3.select("#"+idText).raise().attr('transform','scale(10)').attr('fill','white');
        onZoom = true;
    }
    function dezoomHexa(e,d){
        onAdd=true;
        let idText = d.idText ? d.idText : d.r.idText;        
        d3.select("#"+idText).attr('transform',"");
        onZoom = false;
    }

    function getDetails(e,d){
        if(!d.details){
            //vérifie s'il faut calculer des détails
            if(me.urlDetails && d.r.data){
                let h = d3.select(this);
                h.style('cursor','wait');
                d3.json(me.urlDetails+d.r.data["o:id"]).then(function(data) {
                    d.details = data;
                    if(me.urlCooccurrence){
                        d3.json(me.urlCooccurrence+d.r.data["o:id"]).then(function(data) {
                            d.cooccurrences = data;
                            showCooccurrences(d);
                            h.raise().style('cursor','help');
                        });                    
                    }
                    showDetails(d);
                });            
            }
            //Vérifie s'il faut afficher le modal de changement de concept
            if(me.omk && d.r.data['o:id']){
                showChangeConcept(d.r.data);
            }
        }else{
            if(d.showDetails){
                hideDetails(d);
                hideCooccurrences(d);    
            }else{
                showDetails(d);
                showCooccurrences(d);    
            }
        }

    }
    function initSkosRelations(r, pId=0){
        if(!r)r=skosRelations;
        let p = me.omk.getPropByTerm(r.term);
        r.name = p['o:label'];
        r['o:id'] = p['o:id'];
        //if(pId)r.parentId = pId
        r.children.forEach(rc => initSkosRelations(rc,p['o:id']));
    }
    function initSuggest(){
        let urlSuggest = me.omk.api+'items?resource_class_id='+me.omk.getClassByTerm('skos:Concept')['o:id']
                +'&property[0][property]='+me.omk.getPropId('dcterms:title')
                +'&property[0][type]=in&property[0][text]=%QUERY&sort_by=title';
            sgtConcept = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('o:title'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                identify: function(obj) { 
                    return obj['o:id']; 
                    },
                remote: {
                    url: urlSuggest,
                    wildcard: '%QUERY'
                }
            });
        var promise = sgtConcept.initialize();
            promise
                .done(function() { 
                    console.log('ready to go!'); 
                    sgtConcept.search('a', sync, async);

                    function sync(datums) {
                        console.log('datums from `local`, `prefetch`, and `#add`');
                        console.log(datums);
                    }

                    function async(datums) {
                        console.log('datums from `remote`');
                        console.log(datums);
                    }

                })
                .fail(function() { 
                    console.log('err sgtConcept : something went wrong :('); 
            });        
    }
    function showChangeConcept(d){
        if(!mChangeConcept){
            mChangeConcept = m.add('modalChangeConcept');
            if(d3.select('.twitter-typeahead').empty()){
                mChangeConcept.s.select('.modal-footer').selectAll('button').remove();
                mChangeConcept.s.select('.modal-footer').selectAll('button').data([d]).enter().append('button')
                    .attr('type',"button")
                    .attr('class',"btn btn-danger").html('Change')
                    .on('click',changeConcept);
                $('#choixConcept .typeahead').typeahead(null, {
                    name: 'omk-concept',
                    display: 'o:title',
                    source: sgtConcept,
                    limit:100,
                    templates: {
                        empty: [
                        '<div class="empty-message">',
                            'Impossible de trouver un concept',
                        '</div>'
                        ].join('\n'),
                        suggestion: Handlebars.compile('<div><strong>{{o:title}}</strong> – {{o:id}}</div>')
                    }  
                    });
                $('#choixConcept .typeahead').bind('typeahead:select', function(ev, suggestion) {
                    sltConcept = suggestion;
                });        
            }     
        }
        mChangeConcept.s.select('#choixConceptTitre').text('Changer le concept : '+d.concept["o:title"])             
        mChangeConcept.m.show();
    }
    function showAddCrible(d, fct){
        if(!mAddCrible){
            mAddCrible = m.add('modalAddCrible');
            mAddCrible.s.select('#choixCribleTitre').text('Ajoute un crible');             
            if(d3.select('.twitter-typeahead').empty()){
                //akute l'autocompletion
                mAddCrible.s.select('.modal-footer').selectAll('button').remove();
                mAddCrible.s.select('.modal-footer').selectAll('button').data([d]).enter().append('button')
                    .attr('type',"button")
                    .attr('class',"btn btn-danger").html('Ajouter')
                    .on('click',fct);
                $('#choixCrible .typeahead').typeahead(null, {
                    name: 'omk-concept',
                    display: 'o:title',
                    source: sgtConcept,
                    limit:100,
                    templates: {
                        empty: [
                        '<div class="empty-message">',
                            'Impossible de trouver un concept',
                        '</div>'
                        ].join('\n'),
                        suggestion: Handlebars.compile('<div><strong>{{o:title}}</strong> – {{o:id}}</div>')
                    }  
                    });
                $('#choixCrible .typeahead').bind('typeahead:select', function(ev, suggestion) {
                    sltConcept = suggestion;
                });
                //affiche le modal pour calculer le viewbox du tree
                mAddCrible.m.show();
                //ajoute l'arbre des relations skos
                const t = new tree({
                    cont:mAddCrible.s.select('#treeselect'),
                    data:skosRelations,
                    //id: d => d['o:id'],
                    label: d => d.name,
                    title: (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(".")}`, // hover text
                    width: 400, height:300                  
                });    
            }     
        }else mAddCrible.m.show();
    }

    function changeConcept(e,d){

        let oldCptId = d.concept['o:id'];
        d["dcterms:type"][0].value_resource_id=sltConcept['o:id'];
        me.omk.updateRessource(d['o:id'],null
            ,'items',d,'PATCH',rs=>{
                //mise à jour des données
                d3.selectAll('.cpt'+oldCptId).each(espace=>{
                    p = d3.select(this);
                    p.attr('id',this.id.replace(oldCptId,sltConcept['o:id']));
                    p.attr('class',this.className.replace(oldCptId,sltConcept['o:id']));
                    let idText = espace.idText ? espace.idText : espace.r.idText
                    d3.select('#'+idText)
                        .attr('id',idText.replace(oldCptId,sltConcept['o:id']))
                        .text(sltConcept['o:title']); 
                    updateHexaProp(espace,sltConcept);
                })
                mChangeConcept.m.hide();
            })        
    }
    function showOmkDetails(e,d){
        if(e)d=d.r.data;
        let  md =new modal({'size':'modal-lg'}),
        url = me.omk.api.replace("/api/items","");
        md.setBody('<h3 class="text-white bg-dark">'+d['o:title']+'</h3>'
            +'<iframe class="fiche" src="'+me.omk.getItemAdminLink(d)+'"/>');
        md.setBoutons([{'name':"Close"}]);                
        md.show();   
    }

    function showDetails(d){
        //d3.select('#'+d.id).select('polygon').attr('stroke','white').attr('stroke-width', d.depth)
        d.showDetails = true;
    }
    function hideDetails(d){
        //d3.select('#'+d.id).attr('stroke','black').attr('stroke-width', 1/d.depth/10)
        d.showDetails = false;
    }
    function hideCooccurrences(d){
        let idEspace = d.r ? '#'+d.r.id : d.id;
        d3.select(idEspace).selectAll('.cooccurrences').remove();
    }
    function showCooccurrences(d){      
        if(!d.cooccurrences)return;
        //gestion du zoom
        let rapports, links, contTrans = container.attr('transform')
        , source = d3.select('#'+me.id+'_espace_'+d.r.data["o:id"]);
        container.attr('transform','');
        links = d.cooccurrences.filter(c=>{
                if(c.id==d.r.data["o:id"])return false;
                c.target = d3.select('#'+me.id+'_espace_'+c.id);
                if(c.target.size()==0)return false;
                else{
                    c.source = source;
                    c.sourceCenter = c.source.datum().hexas[0].center;
                    c.targetCenter = c.target.datum().hexas[0].center;
                    c.resources = c.idsR.split(',');
                    c.sourceTitle = d.title;
                    //construction du domaine des rapports pour une proportionnalité entre les ressources
                    if(rapportMax < c.nbValue)rapportMax=c.nbValue;
                    if(rapportMin > c.nbValue)rapportMin=c.nbValue;
                    return true;    
                }
            });
        //met à jour l'échelle des rapports
        rapportWidth = d3.scaleLinear()
                .domain([rapportMin, rapportMax])
                .range([3, d.layoutIn.size.x]);
        //met à jour les occurences déjà présentes
        container.selectAll('.cooccurrences').select('path').attr('stroke-width', r=>rapportWidth(r.nbValue))
        //création des nouveaux rapports
        rapports = source.raise().selectAll('.cooccurrences')
                .data(links)
                .enter().append('g')
                    .attr('class','cooccurrences')
                    .attr('id',r=>{
                        r.points = [
                            [r.sourceCenter.x,r.sourceCenter.y],
                            [r.targetCenter.x,r.targetCenter.y]
                        ]
                        return 'rapport'+d.r.data["o:id"]+'_'+r.id;
                    })
                    .on(me.eventDetailsCooccurrence,showDetailsCooccurrences)
                    .style('cursor','pointer')
                    ;
        rapports.append('path')
            .attr('d', r=>d3.line()(r.points))
            .attr('stroke', '#ffffff32')
            .attr('stroke-width', r=>rapportWidth(r.nbValue))
            //.attr('marker-start', 'url(#point')
            .attr('marker-end', 'url(#point)')
            .attr('stroke-linecap',"round")
            .attr('fill', 'none');
        
        container.attr('transform', contTrans);        
    }
    function showDetailsCooccurrences(e,d){
        if(d.items){
            showListeDoc(d);
        }else{
            //récupère la liste des ressources
            if(me.urlItems){
                d3.json(me.urlItems+'&ids[]='+d.resources.join('&ids[]=')).then(function(data) {
                    d.items = data;
                    showListeDoc(d);
                });                    
            }
        }
    }

    function clickHexa(e,h){
        let d = h.hexa.distance({q:0,s:0,r:0});
        if(h.hexa.toString() == '0,0,0') showOmkDetails(h.data);
        else if(d==1)addNewEspace(e,h);
    }

    
    this.init();
    
    }
}  
