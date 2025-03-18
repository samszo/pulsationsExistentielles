import anime from './anime.es.js';        

export class scenario {
    constructor(params={}) {
        var me = this;
        this.list=params.list ? params.list : [
                {'nom':'Flux Alea','playScenario':'montreFluxAlea'},
                {'nom':'Se tromper','playScenario':'seTromper'}
            ];
        let maxloop = 4, numloop = 0, extPathPoints, flux = [], 
        dur = 100, durMin = 500, durMax = 30000;
        this.init = function () {
            console.log('init scenario')
        }
        this.playScenario=function(svg, nom){
            switch (nom) {
                case 'cache':
                    svg.selectAll(".cache").style("opacity", 0);
                    break;        
                case 'montreFluxAlea':
                    //définition des positions
                    let m=6, bbScene = d3.select("#scene_1").node().getBBox(),
                        pActant = {
                            'nw':[83,115],
                            'ne':[123,115],
                            'e':[144,150],
                            'se':[124,185],
                            'sw':[84,185],
                            'w':[63,151]
                        },
                        bbCribleD = d3.select("#rect3").node().getBBox(),
                        bbCribleG = d3.select("#rect2").node().getBBox(),
                        bbRaisonner = d3.select("#text7").node().getBBox(),
                        bbDicerner = d3.select("#path32").node().getBBox(),
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
                    showFlux();
                    break;
                default:
                    break;
            }
        }
        function replaceParts(nodes){
            //affichage des nouveaux concepts et supression des lignes
            nodes.forEach((g,i)=>{
                d3.select(g)
                    .transition()
                    .duration(dur)
                    .delay(dur*(i+1))
                    .style("opacity", 1);
            })	    
        }
        
        function showFlux(){
            numloop++;    
            if(maxloop<numloop)return;            
            //ajoute les path de flux aléatoires            
            let fluxPath = d3.select("#svg1").append('g').attr('id','fluxPath'),
                nb = d3.randomInt(1, 10)()
            for (let index = 0; index < nb; index++) {
                let c = d3.interpolateInferno(Math.random()),
                    animations = [],
                    path = fluxPath.selectAll('.fluxPath')
                    .data(getAleaPath(extPathPoints)).enter()
                    .append('path')  
                    .attr('d', d=>d.d)
                    .attr('id', (d,i)=>{
                        d.id = 'fluxPath_'+numloop+'_'+index+'_'+i;
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
                    //
                    path.each(d=>{
                        var t = anime.timeline({
                            targets: '#'+d.id,
                            easing: 'easeInOutSine',
                            duration: d.dur,
                            delay: d.delay,
                            direction: 'normal',
                            loop: false,
                            complete: function(anim) {
                                console.log('completed : ' + d.id,d);
                              }
                            });
                        t.add({
                            strokeDashoffset: [anime.setDashoffset, 0],
                        })                        
                        .add({
                            delay: d.delayPersist,
                            duration: d.durPersist,
                            opacity:0,
                        });                        
                        animations.push(t);
                    })
                    //
            }
                        
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
                            paths.push({'type':'curve','delay':0, delayPersist: d3.randomInt(durMin, durMax)()
                                , 'dur':dur[dur.length-1],durPersist: d3.randomInt(durMin, durMax)()
                                ,'d':d3.line().curve(d3.curveBasis)(ap)});
                            arrP.push(ap);
                            //calcule une spirale aléatoire
                            spiT = d3.randomInt(p.minT, p.maxT)()*6;
                            spiR = Math.random(p.minR, p.maxR);
                            ap = Array.from({ length: spiT }, (_, i) => [
                                (Math.PI / 3) * i, // angle (in radians)
                                spiR * i // radius
                              ]);
                            //retourne au centre
                            ap.push([0,0]);
                            //enregistre le chemin pour la spirale
                            dur.push(d3.randomInt(durMin, durMax)());
                            paths.push({'type':'spirale','delay':dur[dur.length-2], delayPersist: d3.randomInt(durMin, durMax)()
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
            paths.push({'type':'curve','delay': dur.length == 1 ? 0 : dur.reduce((s, a) => s + a, 0)
                , 'dur':dur[dur.length-1],durPersist: d3.randomInt(durMin, durMax)(), delayPersist: d3.randomInt(durMin, durMax)()
                ,'d':d3.line().curve(d3.curveBasis)(ap)});
            return paths;
        }        

        this.init();
    }
}
