/*

---------------------------------------------------------------
> o logo da Globo (botão Logo Globo da barra)
---------------------------------------------------------------

O desenho e a animação vêm do script do PROMO (layers lib.js: LOGO_GLOBO): uma shape layer com o corpo, a janela e
a bolinha, branca, com a escala de 740% a 115% (até 0,58 s) e a 80% (até 5,46 s). no meio da comp aberta, acima do
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
	shp.outTangents = [[-55, 0], [0, -55], [55, 0], [0, 55]];
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

		// o mesmo número de eases que a escala tem de dimensões (2 numa shape)
		var ease = function (influence) {
			var list = [];

			for (var d = 0; d < scale.value.length; d++) list.push(new KeyframeEase(0, influence));

			return list;
		};

		try {
			scale.setTemporalEaseAtKey(1, ease(0.1), ease(75));
			scale.setTemporalEaseAtKey(2, ease(33), ease(33));
			scale.setTemporalEaseAtKey(3, ease(75), ease(0.1));
		} catch (err) { }
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
