/*
  Highcharts JS v6.1.0-modified (2018-06-16)
 Highcharts variwide module

 (c) 2010-2017 Torstein Honsi

 License: www.highcharts.com/license
*/
(function(c){"object"===typeof module&&module.exports?module.exports=c:c(Highcharts)})(function(c){(function(b){var c=b.addEvent,p=b.seriesType,h=b.seriesTypes,l=b.each,n=b.pick;p("variwide","column",{pointPadding:0,groupPadding:0},{pointArrayMap:["y","z"],parallelArrays:["x","y","z"],processData:function(){var a=this;this.totalZ=0;this.relZ=[];h.column.prototype.processData.call(this);l(this.zData,function(d,g){a.relZ[g]=a.totalZ;a.totalZ+=d});this.xAxis.categories&&(this.xAxis.variwide=!0)},postTranslate:function(a,
d,g){var k=this.relZ,b=this.xAxis.len,e=this.totalZ,m=a/k.length*b,c=(a+1)/k.length*b,f=n(k[a],e)/e*b;a=n(k[a+1],e)/e*b;g&&(g.crosshairWidth=a-f);return f+(d-m)*(a-f)/(c-m)},translate:function(){var a=this.options.crisp;this.options.crisp=!1;h.column.prototype.translate.call(this);this.options.crisp=a;var b=this.chart.inverted,g=this.borderWidth%2/2;l(this.points,function(a,d){var e=this.postTranslate(d,a.shapeArgs.x,a),c=this.postTranslate(d,a.shapeArgs.x+a.shapeArgs.width);this.options.crisp&&(e=
Math.round(e)-g,c=Math.round(c)-g);a.shapeArgs.x=e;a.shapeArgs.width=c-e;a.plotX=(e+c)/2;a.tooltipPos[b?1:0]=this.postTranslate(d,a.tooltipPos[b?1:0])},this)}},{isValid:function(){return b.isNumber(this.y,!0)&&b.isNumber(this.z,!0)}});b.Tick.prototype.postTranslate=function(a,b,c){a[b]=this.axis.pos+this.axis.series[0].postTranslate(c,a[b]-this.axis.pos)};c(b.Axis,"afterDrawCrosshair",function(a){this.variwide&&this.cross&&this.cross.attr("stroke-width",a.point&&a.point.crosshairWidth)});c(b.Tick,
"afterGetPosition",function(a){var b=this.axis,c=b.horiz?"x":"y";b.categories&&b.variwide&&(this[c+"Orig"]=a.pos[c],this.postTranslate(a.pos,c,this.pos))});b.wrap(b.Tick.prototype,"getLabelPosition",function(a,b,c,k,h,e,m,l){var f=Array.prototype.slice.call(arguments,1),d=h?"x":"y";this.axis.variwide&&"number"===typeof this[d+"Orig"]&&(f[h?0:1]=this[d+"Orig"]);f=a.apply(this,f);this.axis.variwide&&this.axis.categories&&this.postTranslate(f,d,l);return f})})(c)});
