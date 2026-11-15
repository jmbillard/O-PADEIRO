/*

---------------------------------------------------------------
> o logo da Globo (botão Logo Globo da barra)
---------------------------------------------------------------

O desenho e a animação vêm do script do PROMO (layers lib.js: LOGO_GLOBO): uma shape layer com o corpo, a janela e
a bolinha, branca, com a escala de 740% a 115% (até 0,58 s) e a 80% (até 5,46 s), com a suavização (ease) do
original (apagada do PROMO no commit 7efa515, refeita aqui pelos valores de lá). no meio da comp aberta, acima do
layer selecionado (ou no topo).

*/

// a: { animated } → { name, comp }
PADX.logoGlobo = function (a) {
	var comp = app.project.activeItem;

	if (!(comp instanceof CompItem)) throw new Error('#PAD_114 - logo Globo: abra uma comp (ou clique no visualizador dela).');

	var animated = !(a && a.animated === false);
	var above = comp.selectedLayers.length ? comp.selectedLayers[0] : null;
	var layer;

	padUndoBegin('logo Globo');

	try {
		layer = padLogoGloboLayer(comp, animated);
		if (above) layer.moveBefore(above);
		layer.startTime = comp.time > 0 && animated ? comp.time : 0;
	} finally {
		padUndoEnd();
	}

	return { name: layer.name, comp: comp.name };
};

function padLogoGloboLayer(comp, animated) {
	var layer = comp.layers.addShape();
	var contents = layer.property('ADBE Root Vectors Group');
	var logo = contents.addProperty('ADBE Vector Group');
	var shapes;
	var shp;
	var path;

	logo.name = 'logo';
	shapes = logo.property('ADBE Vectors Group');

	// a bolinha
	path = shapes.addProperty('ADBE Vector Shape - Group');
	path.name = 'bolinha';
	shp = new Shape();
	shp.closed = true;
	shp.vertices = [[0, 100], [-100, 0], [0, -100], [100, 0]];
	shp.inTangents = [[55, 0], [0, 55], [-55, 0], [0, -55]];
	shp.outTangents = [[-55, 0], [0, -55], [55, 0], [0, 50]]; // como no original
	path.property('ADBE Vector Shape').setValue(shp);

	// a janela
	path = shapes.addProperty('ADBE Vector Shape - Group');
	path.name = 'janela';
	shp = new Shape();
	shp.closed = true;
	shp.vertices = [
		[198.66, 102.38], [180.8, 120.2], [1.57, 126.83], [0.63, 126.83], [0, 126.83], [-0.63, 126.83],
		[-1.58, 126.83], [-180.86, 120.2], [-198.66, 102.37], [-204.84, 2.79], [-204.84, 0], [-204.84, -2.79],
		[-198.66, -102.38], [-180.8, -120.21], [-1.58, -126.83], [-1.58, -126.83], [-0.63, -126.83], [0, -126.83],
		[0.63, -126.83], [1.57, -126.83], [1.57, -126.83], [180.86, -120.2], [198.66, -102.37], [204.84, -2.79],
		[204.84, -2.79], [204.83, -0.01], [204.84, 2.79]
	];
	shp.inTangents = [
		[0, 0], [10, 0], [100, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 10],
		[0, 55], [0, 0], [0, 0], [0, 0], [-10, 0], [-100, 0], [0, 0], [0, 0], [0, 0],
		[0, 0], [0, 0], [0, 0], [0, 0], [0, -10], [0, -55], [0, 0], [0, 0], [0, 0]
	];
	shp.outTangents = [
		[0, 10], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [-100, 0], [-10, 0], [0, 0],
		[0, 0], [0, 0], [0, -55], [0, -10], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0],
		[0, 0], [0, 0], [100, 0], [10, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 55]
	];
	path.property('ADBE Vector Shape').setValue(shp);

	// o corpo (no sentido contrário: a janela vira o buraco)
	path = shapes.addProperty('ADBE Vector Shape - Group');
	path.name = 'corpo';
	path.property('ADBE Vector Shape Direction').setValue(3);
	shp = new Shape();
	shp.closed = true;
	shp.vertices = [[0, -254], [254, 0], [0, 254], [-254, 0]];
	shp.inTangents = [[-140, 0], [0, -140], [140, 0], [0, 140]];
	shp.outTangents = [[140, 0], [0, 140], [-140, 0], [0, -140]];
	path.property('ADBE Vector Shape').setValue(shp);

	// a escala: entra grande e assenta (a do PROMO); parado, 80%
	var scale = logo.property('ADBE Vector Transform Group').property('ADBE Vector Scale');

	if (animated) {
		scale.setValueAtTime(0.0417, [740, 740]);
		scale.setValueAtTime(0.5839, [115, 115]);
		scale.setValueAtTime(5.4638, [80, 80]);

		// a suavização do script original do PROMO (apagada de lá no commit 7efa515): bézier nas três chaves, com a
		// velocidade e a influência de cada uma (uma por dimensão da escala)
		var ease = function (speed, influence) {
			var list = [];

			for (var d = 0; d < scale.value.length; d++) list.push(new KeyframeEase(speed, influence));

			return list;
		};
		var keys = [[[0, 16.6667], [-14330, 2]], [[-130, 55], [-130, 5]], [[0, 30], [0, 16.6667]]];

		for (var k = 0; k < keys.length; k++) {
			scale.setInterpolationTypeAtKey(k + 1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
			scale.setTemporalEaseAtKey(k + 1, ease(keys[k][0][0], keys[k][0][1]), ease(keys[k][1][0], keys[k][1][1]));
		}
	} else {
		scale.setValue([80, 80]);
	}

	// branco
	var fill = contents.addProperty('ADBE Vector Graphic - Fill');

	fill.name = 'color';
	fill.property('ADBE Vector Fill Color').setValue([1, 1, 1, 1]);

	layer.name = 'LOGO GLOBO';

	return layer;
}
