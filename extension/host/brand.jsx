/*

---------------------------------------------------------------
> o logo da Globo (botão Logo Globo da barra)
---------------------------------------------------------------

LOGO_GLOBO: o script do PROMO exatamente como está lá (source/libraries/functions/layers lib.js, na versão com a
suavização dos keyframes: commit dbffcd3). parado (clique direito): o mesmo logo, sem os keyframes, em 80%.

*/

// a: { animated } → { name, comp }
PADX.logoGlobo = function (a) {
	var comp = app.project.activeItem;

	if (!(comp instanceof CompItem)) throw new Error('#PAD_114 - logo Globo: abra uma comp (ou clique no visualizador dela).');

	var layer;

	padUndoBegin('logo GLOBO');

	try {
		layer = LOGO_GLOBO();

		if (a && a.animated === false) {
			var scale = layer.property('ADBE Root Vectors Group').property('logo').property('ADBE Vector Transform Group').property('ADBE Vector Scale');

			while (scale.numKeys) scale.removeKey(1);
			scale.setValue([80, 80]);
		}
	} finally {
		padUndoEnd();
	}

	return { name: layer.name, comp: comp.name };
};

function LOGO_GLOBO() {

	// shape object variable...
	var shp;

	// shape layer creation...
	var layer = app.project.activeItem.layers.addShape();

	// vector content...
	var contents = layer.property('ADBE Root Vectors Group');
	logo_contents1 = contents.addProperty('ADBE Vector Group');
	logo_contents1.name = 'logo';
	contents_logo2 = logo_contents1.addProperty('ADBE Vectors Group');
	bolinha_contents3 = contents_logo2.addProperty('ADBE Vector Shape - Group');
	bolinha_contents3.name = 'bolinha';

	shp = new Shape();
	shp.closed= true;
	shp.inTangents= [[55,0],[0,55],[-55,0],[0,-55]];
	shp.outTangents= [[-55,0],[0,-55],[55,0],[0,50]];
	shp.vertices= [[0,100],[-100,0],[0,-100],[100,0]];

	bolinha_contents3.property('ADBE Vector Shape').setValue(shp);
	janela_contents3 = contents_logo2.addProperty('ADBE Vector Shape - Group');
	janela_contents3.name = 'janela';

	shp = new Shape();
	shp.closed= true;
	shp.inTangents= [[0,0],[10,0],[100,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,10],[0,55],[0,0],[0,0],[0,0],[-10,0],[-100,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,-10],[0,-55],[0,0],[0,0],[0,0]];
	shp.outTangents= [[0,10],[0,0],[0,0],[0,0],[0,0],[0,0],[-100,0],[-10,0],[0,0],[0,0],[0,0],[0,-55],[0,-10],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[100,0],[10,0],[0,0],[0,0],[0,0],[0,0],[0,55]];
	shp.vertices= [[198.66,102.38],[180.8,120.2],[1.57,126.83],[0.63,126.83],[0,126.83],[-0.63,126.83],[-1.58,126.83],[-180.86,120.2],[-198.66,102.37],[-204.84,2.79],[-204.84,0],[-204.84,-2.79],[-198.66,-102.38],[-180.8,-120.21],[-1.58,-126.83],[-1.58,-126.83],[-0.63,-126.83],[0,-126.83],[0.63,-126.83],[1.57,-126.83],[1.57,-126.83],[180.86,-120.2],[198.66,-102.37],[204.84,-2.79],[204.84,-2.79],[204.83,-0.01],[204.84,2.79]];

	janela_contents3.property('ADBE Vector Shape').setValue(shp);
	corpo_contents3 = contents_logo2.addProperty('ADBE Vector Shape - Group');
	corpo_contents3.name = 'corpo';
	corpo_contents3.property('ADBE Vector Shape Direction').setValue(3);

	shp = new Shape();
	shp.closed= true;
	shp.inTangents= [[-140,0],[0,-140],[140,0],[0,140]];
	shp.outTangents= [[140,0],[0,140],[-140,0],[0,-140]];
	shp.vertices= [[0,-254],[254,0],[0,254],[-254,0]];

	corpo_contents3.property('ADBE Vector Shape').setValue(shp);
	transform_logo2 = logo_contents1.addProperty('ADBE Vector Transform Group');

	// transform scale animation...
	// key 1...
	transform_logo2.property('ADBE Vector Scale').setValueAtTime(0.04170837504171, [740,740]);
	// key 2...
	transform_logo2.property('ADBE Vector Scale').setValueAtTime(0.58391725058392, [115,115]);
	// key 3...
	transform_logo2.property('ADBE Vector Scale').setValueAtTime(5.4637971304638, [80,80]);

	// key 1 ease...
	transform_logo2.property('ADBE Vector Scale').setInterpolationTypeAtKey(1, 6613, 6613);
	var easeIn1 = new KeyframeEase(0, 16.6667);
	var easeOut1 = new KeyframeEase(-14330, 2);
	transform_logo2.property('ADBE Vector Scale').setTemporalEaseAtKey(1, [easeIn1, easeIn1], [easeOut1, easeOut1]);
	// key 2 ease...
	transform_logo2.property('ADBE Vector Scale').setInterpolationTypeAtKey(2, 6613, 6613);
	var easeIn2 = new KeyframeEase(-130, 55);
	var easeOut2 = new KeyframeEase(-130, 5);
	transform_logo2.property('ADBE Vector Scale').setTemporalEaseAtKey(2, [easeIn2, easeIn2], [easeOut2, easeOut2]);
	// key 3 ease...
	transform_logo2.property('ADBE Vector Scale').setInterpolationTypeAtKey(3, 6613, 6613);
	var easeIn3 = new KeyframeEase(0, 30);
	var easeOut3 = new KeyframeEase(0, 16.6667);
	transform_logo2.property('ADBE Vector Scale').setTemporalEaseAtKey(3, [easeIn3, easeIn3], [easeOut3, easeOut3]);

	// fill color...
	color_contents1 = contents.addProperty('ADBE Vector Graphic - Fill');
	color_contents1.name = 'color';
	color_contents1.property('ADBE Vector Fill Color').setValue([1,1,1,1]);

	// layer attributes...
	layer.name = 'LOGO GLOBO';

	return layer;
}
