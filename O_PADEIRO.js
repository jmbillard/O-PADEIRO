/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

function O_PADEIRO_UTL(thisObj) {
	// Declaração da versão do script 'O Padeiro'
	var scriptName = 'O PADEIRO';
	var scriptVersion = 'v1.94';

	try {
		scriptMainPath = scriptMainPath;
	
	} catch (err) {
		var startMsg = 'você instalou o arquivo ".jsxbin"!\
o script funcionará normalmente, mas você não terá:\n\
    - atualizações automáticas\
    - lista inicial de produções com templates\
    - novos recursos e correções de bugs.';
		alert(startMsg);
		scriptMainPath = Folder.userData.fsName + '/O PADEIRO script/';
	}

	#include 'source/libraries/JSON lib.js';        // Inclui funções para trabalhar com dados JSON
	#include 'source/libraries/PROT lib.js';        // Inclui funções que estendem objetos JavaScript (prototype)
	#include 'source/libraries/ICON lib.js';        // Inclui ícones codificados para a interface
	
	#include 'source/globals.js';                   // Inclui variáveis globais (usadas em todo o script)

	#include 'source/libraries/FUNC lib.js';        // Inclui funções utilitárias gerais

	#include 'source/libraries/functions/web lib.js';
	#include 'source/libraries/functions/color lib.js';
	#include 'source/libraries/functions/ctrl anim lib.js';
	#include 'source/libraries/functions/file system lib.js';
	#include 'source/libraries/functions/layers lib.js';
	#include 'source/libraries/functions/math num lib.js';
	#include 'source/libraries/functions/string lib.js';
	#include 'source/libraries/functions/treeView lib.js';
	#include 'source/libraries/functions/metadata lib.js';

	// utilidades com interface
	#include 'source/Utils/o padeiro templates ui.js'; // Sistema de templates
	#include 'source/Utils/o padeiro maker ui.js';     // Editor de templates
	#include 'source/Utils/o padeiro folders ui.js';   // Lista de pastas de produção
	#include 'source/Utils/find ui.js';                 // Busca em layers de texto
	#include 'source/Utils/path ui.js';                 // Conversor de caminhos Windows / MacOS
	#include 'source/Utils/o acessorista ui.js';          // O Acessorista: busca de caminhos de atrações
	#include 'source/layout/main ui functions.js';  // Inclui funções para criar a interface do usuário

	// Estrutura da ui principal: cada botão declara rótulo, ícone, dicas e as ações
	// de clique esquerdo / direito (funções em PAD_ACTIONS, 'main ui functions.js').
	var PAD_mainGrpUiStructure = {
		pinGrp: {
			section0: {
				links: {
					type: 'iconButton',
					labelTxt: 'Links',
					icon: PAD_LINKS_ICON,
					tips: [
						lClick + 'abrir apontamento de projetos'
					],
					leftClick: PAD_ACTIONS.abrirApontamento
				}
			}
		},
		mainGrp: {
			section1: {
				templates: {
					type: 'imageButton',
					labelTxt: 'Templates',
					icon: PAD_TEMPLATES_ICON,
					tips: [
						lClick + 'preencher templates',
						rClick + 'criar novo template'
					],
					leftClick: PAD_ACTIONS.preencherTemplates,
					rightClick: PAD_ACTIONS.criarTemplate
				},
				fontes: {
					type: 'imageButton',
					labelTxt: 'Fontes',
					icon: PAD_FONTES_ICON,
					tips: [
						lClick + 'instalar as fontes usadas no template',
						rClick + 'fazer o collect das fontes usadas no projeto'
					],
					leftClick: PAD_ACTIONS.instalarFontes,
					rightClick: PAD_ACTIONS.coletarFontes
				}
			},
			section2: {
				pastas: {
					type: 'imageButton',
					labelTxt: 'Pastas',
					icon: PAD_PASTAS_ICON,
					tips: [
						lClick + 'abir a pasta do último item da fila de render',
						rClick + 'abrir o conversor de caminhos Windows/MacOs'
					],
					leftClick: PAD_ACTIONS.abrirPastaOutput,
					rightClick: PAD_ACTIONS.abrirConversorCaminhos
				}
			},
			section3: {
				renomear: {
					type: 'imageButton',
					labelTxt: 'Renomear',
					icon: PAD_RENOMEAR_ICON,
					tips: [
						lClick + 'renomear comps selecionadas',
						rClick + 'renomear TODAS as saídas de render'
					],
					leftClick: PAD_ACTIONS.renomearComps,
					rightClick: PAD_ACTIONS.renomearOutputs
				},
				organizar: {
					type: 'imageButton',
					labelTxt: 'Organizar',
					icon: PAD_ORGANIZAR_ICON,
					tips: [
						'selecione as comps que serão\nRENDERIZADAS primeiro!',
						lClick + 'organizar o projeto',
						rClick + 'criar estrutura de pastas do projeto'
					],
					leftClick: PAD_ACTIONS.organizarProjeto,
					rightClick: PAD_ACTIONS.criarPastasProjeto
				}
			},
			section4: {
				buscar: {
					type: 'imageButton',
					labelTxt: 'Buscar',
					icon: PAD_BUSCAR_ICON,
					tips: [
						lClick + 'abrir a BUSCA em layers de texto',
						rClick + 'abrir a BUSCA de caminhos de atrações'
					],
					leftClick: PAD_ACTIONS.buscarTextos,
					rightClick: PAD_ACTIONS.buscarCaminhos
				}
			// },
			// section5: {
			// 	mensagem: {
			// 		type: 'imageButton',
			// 		labelTxt: 'Mensagem',
			// 		icon: PAD_BUSCAR_ICON,
			// 		tips: [
			// 			lClick + 'copiar mensagem padrão para o clipboard'
			// 		]
			// 	}
			}
		}
	};

	function PAD_WINDOW(thisObj) {
		PAD_ui.window = thisObj;

		if (!(thisObj instanceof Panel)) PAD_ui.window = new Window('palette', scriptName + ' ' + scriptVersion); // Cria uma nova janela

		PAD_BUILD_UI(PAD_mainGrpUiStructure, PAD_ui);

		return PAD_ui.window;
	}

	// Cria a janela da interface chamando a função PAD_UI_EVENTS e passando o objeto atual como argumento. O resultado é armazenado na variável O_PADEIRO_WINDOW.
	var O_PADEIRO_WINDOW = PAD_WINDOW(thisObj);

	// Verifica o acesso à rede.
	if (!netAccess()) {
		// Se não houver acesso, exibe um alerta pedindo para habilitar o acesso à rede nas preferências.
		alert('por favor, habilite a opção ' + AE_netConfigName + ' nas preferencias');

		// Abre a janela de preferências do After Effects na seção de scripts.
		app.executeCommand(3131);

		// Verifica novamente se há acesso à rede.
		if (!netAccess()) {
			// Se ainda não houver acesso, exibe outro alerta informando que a funcionalidade será limitada.
			alert(lol + '#PAD_012 - sem acesso a rede...');
		}
	}

	// Verifica se a interface (O_PADEIRO_WINDOW) está sendo executada como uma janela flutuante.
	if (!(O_PADEIRO_WINDOW instanceof Panel)) O_PADEIRO_WINDOW.show();
	// Retorna o objeto da janela (O_PADEIRO_WINDOW).
	return O_PADEIRO_WINDOW;
}

// Executa tudo... ヽ(✿ﾟ▽ﾟ)ノ
O_PADEIRO_UTL(this);
