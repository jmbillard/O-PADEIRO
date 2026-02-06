function pathDialog(path) {

    macPath = appOs == 'Mac'
        ? path
        : normalizeNetworkPath(path, { forceMac: true });
    winPath = appOs == 'Win'
        ? normalizeNetworkPath(path, { forceBackslash: true }).replace(/^c\//, 'C:\\')
        : normalizeNetworkPath(path, { forceWin: true, forceBackslash: true }).replace(/^\\Users\\/, 'C:\\Users\\');
    // PALETTE
    // =======
    var palette = new Window("palette");
    palette.text = "Pastas v1";
    palette.orientation = "column";
    palette.alignChildren = ["center", "top"];
    palette.spacing = 10;
    palette.margins = 16;

    // GROUP1
    // ======
    var group1 = palette.add("group", undefined, { name: "group1" });
    group1.orientation = "row";
    group1.alignChildren = ["left", "center"];
    group1.spacing = 10;
    group1.margins = 0;

    // GROUP2
    // ======
    var group2 = group1.add("group", undefined, { name: "group2" });
    group2.orientation = "column";
    group2.alignChildren = ["left", "center"];
    group2.spacing = 10;
    group2.margins = 0;

    // GROUP3
    // ======
    var group3 = group2.add("group", undefined, { name: "group3" });
    group3.orientation = "row";
    group3.alignChildren = ["left", "center"];
    group3.spacing = 10;
    group3.margins = 0;

    var statictext1 = group3.add("statictext", undefined, undefined, { name: "statictext1" });
    statictext1.text = "MacOS:";
    statictext1.preferredSize.width = 60;

    var macPathTxt = group3.add('edittext {properties: {name: "macPathTxt"}}');
    macPathTxt.text = macPath;
    macPathTxt.preferredSize.width = 900;

    // GROUP4
    // ======
    var group4 = group2.add("group", undefined, { name: "group4" });
    group4.orientation = "row";
    group4.alignChildren = ["left", "center"];
    group4.spacing = 10;
    group4.margins = 0;

    var statictext2 = group4.add("statictext", undefined, undefined, { name: "statictext2" });
    statictext2.text = "Windows:";
    statictext2.preferredSize.width = 60;

    var winPathTxt = group4.add('edittext {properties: {name: "winPathTxt"}}');
    winPathTxt.text = winPath;
    winPathTxt.preferredSize.width = 900;

    // GROUP1
    // ======
    var openPathBtn = group1.add("button", undefined, undefined, { name: "openPathBtn" });
    openPathBtn.text = "Abrir Pasta";
    openPathBtn.preferredSize.width = 80;
    openPathBtn.preferredSize.height = 56;

    palette.show();

    openPathBtn.onClick = function () {

        var fldPath = appOs == 'Mac' ? macPathTxt.text : winPathTxt.text;
        // Abre a pasta de saída no sistema operacional do usuário.
        openFolder(normalizeNetworkPath(fldPath));
    }

    winPathTxt.onEnterKey = function () {

        macPath = normalizeNetworkPath(winPathTxt.text.replace(/^C:\\/, '\\'), { forceMac: true });
        macPathTxt.text = macPath;
    }

    macPathTxt.onEnterKey = function () {

        winPath = normalizeNetworkPath(macPathTxt.text, { forceWin: true })
            .replace(/^\/Users\//, 'C:/Users/')  // Primeiro substitui com barras normais
            .replace(/\//g, '\\');               // Depois converte todas as barras

        winPathTxt.text = winPath;
    }

    return palette;

};