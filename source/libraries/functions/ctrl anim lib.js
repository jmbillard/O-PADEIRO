/* eslint-disable no-undef */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🖌️ animation
---------------------------------------------------------------

*/

// Trava as propriedades de transformação de uma camada usando expressões.
function lockTrmProp(sLayer) {
	var trm = sLayer.property('ADBE Transform Group'); // Obtém o grupo de transformação da camada
	var expStr = '// locked...\n'; // String de comentário para a expressão

	// Itera sobre cada propriedade do grupo de transformação
	for (var p = 1; p <= trm.numProperties; p++) {
		var prop = trm.property(p); // Obtém a propriedade atual
		var val = prop.value; // Obtém o valor da propriedade

		// Pula propriedades que não podem ter expressão, já têm keyframes ou já possuem expressão
		if (!prop.canSetExpression || prop.numKeys > 0 || prop.expression != '')
			continue;

		// Converte o valor para string formatada para arrays, se necessário
		if (Array.isArray(val)) {
			val = '[' + val.toString() + ']';
		}

		// Define a expressão da propriedade como o valor atual, efetivamente travando-a
		prop.expression = expStr + val.toString() + ';';
	}
}

// Clona as expressões da camada de origem (sLayer) para a camada de destino (cLayer).
function cloneExpressions(sLayer, cLayer) {
	var sTrm = sLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de origem
	var cTrm = cLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de destino

	// Temporariamente define o parent da camada de origem como o mesmo da camada de destino
	sLayer.parent = cLayer.parent;

	// Itera sobre as propriedades do grupo de transformação da camada de origem
	for (var p = 1; p <= sTrm.numProperties; p++) {
		var prop = sTrm.property(p); // Propriedade atual da camada de origem
		var cProp = cTrm.property(p); // Propriedade correspondente na camada de destino
		var expStr = prop.expression; // Expressão da propriedade de origem

		// Ignora a propriedade Opacidade e propriedades sem expressão
		if (prop.matchName == 'ADBE Opacity' || prop.expression == '') continue;

		// Remove temporariamente a expressão da propriedade de origem
		prop.expression = '';

		// Tenta definir o valor da propriedade de destino para o valor da propriedade de origem
		try {
			cProp.setValue(prop.value);
		//
} catch (err) {} // Ignora erros caso o valor não possa ser definido

		// Define a expressão da propriedade de destino como a expressão da propriedade de origem
		cTrm.property(p).expression = expStr;

		// Se a propriedade for Posição, restaura o valor original na camada de origem após clonar a expressão
		if (prop.matchName == 'ADBE Position') {
			prop.setValue(cProp.value);
		}
	}

	// Restaura o parent original da camada de origem
	sLayer.parent = cLayer;
}

// Copia as propriedades dos keyframes de uma propriedade de origem (prop) para uma propriedade de destino (cProp).
function setKeys(prop, cProp) {
	// Itera sobre cada keyframe da propriedade de origem
	for (var k = 1; k <= prop.numKeys; k++) {
		var t = prop.keyTime(k); // Obtém o tempo do keyframe
		var v = prop.keyValue(k); // Obtém o valor do keyframe
		cProp.setValueAtTime(t, v); // Define o valor do keyframe na propriedade de destino

		var tInTArray = prop.keyInTemporalEase(k); // Obtém a suavização temporal de entrada do keyframe
		var tOutTArray = prop.keyOutTemporalEase(k); // Obtém a suavização temporal de saída do keyframe
		cProp.setTemporalEaseAtKey(k, tInTArray, tOutTArray); // Define a suavização temporal do keyframe na propriedade de destino

		var kInIType = prop.keyInInterpolationType(k); // Obtém o tipo de interpolação de entrada do keyframe
		var kOutIType = prop.keyOutInterpolationType(k); // Obtém o tipo de interpolação de saída do keyframe
		cProp.setInterpolationTypeAtKey(k, kInIType, kOutIType); // Define o tipo de interpolação do keyframe na propriedade de destino

		// Se a propriedade for espacial (ex: Posição), copia as tangentes espaciais
		if (prop.isSpatial) {
			var kInSArray = prop.keyInSpatialTangent(k); // Obtém a tangente espacial de entrada do keyframe
			var kOutSArray = prop.keyOutSpatialTangent(k); // Obtém a tangente espacial de saída do keyframe
			cProp.setSpatialTangentsAtKey(k, kInSArray, kOutSArray); // Define as tangentes espaciais do keyframe na propriedade de destino

			var ct = prop.keySpatialContinuous(k); // Obtém o estado de continuidade espacial do keyframe
			cProp.setSpatialContinuousAtKey(k, ct); // Define a continuidade espacial do keyframe na propriedade de destino
		}
	}
}

// Clona os keyframes da camada de origem (sLayer) para a camada de destino (cLayer).
function cloneKeys(sLayer, cLayer) {
	var sLayerTrm = sLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de origem
	var cLayerTrm = cLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de destino

	// Temporariamente define o parent da camada de origem como o mesmo da camada de destino
	sLayer.parent = cLayer.parent;

	// Itera sobre as propriedades do grupo de transformação da camada de origem
	for (var p = 1; p <= sLayerTrm.numProperties; p++) {
		var sProp = sLayerTrm.property(p); // Propriedade atual da camada de origem
		var cProp = cLayerTrm.property(p); // Propriedade correspondente na camada de destino

		// Ignora propriedades sem keyframes e a propriedade Opacidade
		if (sProp.numKeys == 0 || sProp.matchName == 'ADBE Opacity') continue;

		// Se a propriedade tiver dimensões separadas
		if (sProp.dimensionsSeparated) {
			cProp.dimensionsSeparated = true; // Habilita dimensões separadas na propriedade de destino

			// Itera sobre as dimensões da propriedade
			for (var d = 0; d < sProp.value.length; d++) {
				var sPropD = sProp.getSeparationFollower(d); // Obtém a propriedade separada da origem
				var cPropD = cProp.getSeparationFollower(d); // Obtém a propriedade separada do destino
				setKeys(sPropD, cPropD); // Copia os keyframes
				while (sPropD.numKeys > 0) sPropD.removeKey(1); // Remove os keyframes da origem
			}
		} else {
			setKeys(sProp, cProp); // Copia os keyframes
			while (sProp.numKeys > 0) sProp.removeKey(1); // Remove os keyframes da origem
		}

		// Tenta definir o valor da propriedade de origem para o valor da propriedade de destino
		try {
			sProp.setValue(cProp.value);
		//
} catch (err) {}
	}
	// Restaura o parent original da camada de origem
	sLayer.parent = cLayer;

	// Redefine as propriedades Posição e Escala da camada de origem
	sLayerTrm.property('ADBE Position').dimensionsSeparated = false;
	sLayerTrm.property('ADBE Position').setValue([0, 0, 0]);
	sLayerTrm.property('ADBE Scale').setValue([100, 100, 100]);
}

// Adiciona um pseudo efeito à primeira camada da composição ativa.
function addPseudoEffect(fxName, strCode) {
	// Cria um objeto com o nome e o código do pseudo efeito.
	var fx = {
		name: fxName,
		binary: [strCode],
	};

	var tempFolder = new Folder(tempPath); // Obtém a pasta temporária para armazenar o preset

	// Cria a pasta temporária se ela não existir.
	if (!tempFolder.exists) {
		tempFolder.create();
	}

	var aPreset = createPresetFile(tempPath, fx.name, fx.binary); // Cria um arquivo de preset temporário

	// Tenta aplicar o preset à primeira camada da composição ativa.
	try {
		app.project.activeItem.layer(1).applyPreset(File(aPreset));
	//
} catch (err) {} // Ignora erros caso a aplicação do preset falhe (por exemplo, se a camada não existir)
}

// Reposiciona e parenteia uma camada (cLayer) sob outra camada (sLayer), mantendo a hierarquia e as propriedades.
function setHierarchy(sLayer, cLayer) {
	var sTrm = sLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de origem (sLayer)
	var sPos = sTrm.property('ADBE Position'); // Propriedade de posição da camada de origem
	var cTrm = cLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de destino (cLayer)
	var cPos = cTrm.property('ADBE Position'); // Propriedade de posição da camada de destino

	// Se a camada de origem tiver um parent, define o mesmo parent para a camada de destino
	if (sLayer.parent != null) cLayer.parent = sLayer.parent;

	// Se a camada de origem for 3D ou uma camada de luz, define a camada de destino como 3D
	if (sLayer.threeDLayer || sLayer instanceof LightLayer)
		cLayer.threeDLayer = true;

	cPos.setValue(sPos.value); // Define a posição da camada de destino como a posição da camada de origem

	// Se a camada de origem for uma camada de câmera, define a camada de destino como 3D
	if (sLayer instanceof CameraLayer) cLayer.threeDLayer = true;

	sLayer.parent = cLayer; // Define a camada de origem como parent da camada de destino

	// Itera sobre as propriedades do grupo de transformação da camada de origem
	for (var i = 1; i <= sTrm.numProperties; i++) {
		// Se a propriedade tiver dimensões separadas, define a mesma configuração na propriedade correspondente da camada de destino
		if (sTrm.property(i).dimensionsSeparated)
			cTrm.property(i).dimensionsSeparated = true;
	}
}

// Encontra o ponto central de um conjunto de camadas (lArray) com base em suas posições.
function findCenter(lArray) {
	var maxY = -Infinity; // Valor inicial mínimo para Y (negativo infinito para garantir que qualquer valor seja maior)
	var minY = Infinity; // Valor inicial máximo para Y (infinito para garantir que qualquer valor seja menor)
	var maxX = -Infinity; // Valor inicial mínimo para X
	var minX = Infinity; // Valor inicial máximo para X
	var maxZ = -Infinity; // Valor inicial mínimo para Z
	var minZ = Infinity; // Valor inicial máximo para Z

	// Itera sobre as camadas em lArray
	for (var i = 0; i < lArray.length; i++) {
		var lPos = lArray[i]
			.property('ADBE Transform Group')
			.property('ADBE Position'); // Obtém a propriedade de posição da camada

		// Atualiza os valores máximos e mínimos para cada coordenada (X, Y, Z)
		maxX = Math.max(maxX, lPos.value[0]);
		minX = Math.min(minX, lPos.value[0]);
		maxY = Math.max(maxY, lPos.value[1]);
		minY = Math.min(minY, lPos.value[1]);
		maxZ = Math.max(maxZ, lPos.value[2]);
		minZ = Math.min(minZ, lPos.value[2]);
	}

	// Calcula e retorna o ponto central como um array [X, Y, Z]
	return [
		minX + (maxX - minX) / 2,
		minY + (maxY - minY) / 2,
		minZ + (maxZ - minZ) / 2,
	];
}

// Aplica suavização (ease) aos keyframes selecionados de uma camada (sLayer).
function applyEase(sLayer) {
	var selProps = sLayer.selectedProperties; // Obtém as propriedades selecionadas da camada

	// Itera sobre as propriedades selecionadas
	for (var p = 0; p < selProps.length; p++) {
		var aProp = selProps[p]; // Propriedade atual
		var selKeys = aProp.selectedKeys; // Keyframes selecionados na propriedade

		// Itera sobre os keyframes selecionados
		for (var k = 0; k < selKeys.length; k++) {
			var aKey = selKeys[k]; // Keyframe atual

			// Cria objetos KeyframeEase para suavização de entrada e saída
			var easeOut = new KeyframeEase(0, easeOutInfluence);
			var easeIn = new KeyframeEase(0, easeInInfluence);
			var easeInArray = [easeIn]; // Array para suavização de entrada (pode ser multidimensional)
			var easeOutArray = [easeOut]; // Array para suavização de saída (pode ser multidimensional)

			// Tenta aplicar a suavização ao keyframe
			try {
				aProp.setTemporalEaseAtKey(aKey, easeInArray, easeOutArray);
			//
} catch (err) {
				// Se a propriedade for multidimensional (ex: Posição), ajusta os arrays de suavização
				if (Array.isArray(aProp.value)) {
					for (var e = 1; e < aProp.value.length; e++) {
						easeOutArray.push(easeOut);
						easeInArray.push(easeIn);
					}
				}

				// Aplica a suavização com os arrays ajustados
				aProp.setTemporalEaseAtKey(aKey, easeInArray, easeOutArray);
			}
			// Define o tipo de interpolação do keyframe na propriedade de destino
			aProp.setInterpolationTypeAtKey(
				aKey,
				keyData.inType,
				keyData.outType,
			);
		}
	}
}
