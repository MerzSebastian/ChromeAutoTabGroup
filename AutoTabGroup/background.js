// Known Bugs:
// - UI icons sometimes being stuck after collapsing.
// - collapse on click only works initially, does not detect if tab is active if you click it again. collapses everything after second click (sometimes)
// - darkmode icon not changing on initial chrome startup. works after first click on icon, also no action on first click on icon somehow
// Wanted features:
// - custom tab-names/regex patterns
// - 


let collapseOnClick;
let addSinglePagesToGroup;

const setDarkmode = (darkmode = true) => {
  path = {
    16: `icons/${darkmode ? 'white' : 'black'}/16.png`,
    24: `icons/${darkmode ? 'white' : 'black'}/24.png`,
    32: `icons/${darkmode ? 'white' : 'black'}/32.png`,
    48: `icons/${darkmode ? 'white' : 'black'}/48.png`,
    64: `icons/${darkmode ? 'white' : 'black'}/64.png`,
    72: `icons/${darkmode ? 'white' : 'black'}/72.png`,
    80: `icons/${darkmode ? 'white' : 'black'}/80.png`,
    96: `icons/${darkmode ? 'white' : 'black'}/96.png`,
    128: `icons/${darkmode ? 'white' : 'black'}/128.png`
  };
  chrome.action.setIcon({ path: path });
}

const createMenu = (darkmode, collapseOnClick) => {
  const MenuOptions = [
    { id: 0, title: 'Collapse on click', status: collapseOnClick },
    { id: 1, title: 'Darkmode', status: darkmode },
    { id: 2, title: 'Add single pages to group', status: addSinglePagesToGroup },
  ];
  MenuOptions.forEach((option) => {
    try {
      chrome.contextMenus.create({
        id: option.id.toString(),
        title: option.title,
        type: "checkbox",
        checked: option.status,
        contexts: ['action'],
      });
    }
    catch (error) {
      console.log("menuOption already exists");
    }
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => handleMenu(info, tab));
};

const handleMenu = (info, tab) => {
  switch (info.menuItemId) {
    case "0":
      collapseOnClick = info.checked;
      chrome.storage.sync.set({ "collapseOnClick": info.checked });
      break;
      case "1":
        setDarkmode(info.checked);
        chrome.storage.sync.set({ "darkmode": info.checked });
        break;
      case "2":
        addSinglePagesToGroup = info.checked;
        chrome.storage.sync.set({ "addSinglePagesToGroup": info.checked });
        break;
    default:
      break;
  }
};

chrome.storage.sync.get(["collapseOnClick", "darkmode"], function (items) {
  const darkmode = items.darkmode ? items.darkmode : false;
  addSinglePagesToGroup = items.addSinglePagesToGroup ? items.addSinglePagesToGroup : true;
  darkmode && setDarkmode();
  collapseOnClick = items.collapseOnClick ? items.collapseOnClick : true;
  createMenu(darkmode, collapseOnClick);
});

chrome.action.onClicked.addListener(async (tab) => {
  chrome.tabs.query({}, async function (tabs) {
    const existingGroups = await chrome.tabGroups.query({});
    const groupExists = (name, groups) => { return groups.filter((el) => el.title == name)[0]; };
    groupsToCreate = [];
    tabs.forEach((tab) => {
      const newTabName = tab.url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/)[1];
      const existingGroup = groupExists(newTabName, existingGroups);
      if (existingGroup) {
        // ToDo: collect and group/update together after tabs.forEach like groupsToCreate (tabsToAddToExistingGroups?), why dont just use the array we can provide
        chrome.tabs.group({ groupId: existingGroup.id, tabIds: [tab.id] });
        chrome.tabGroups.update(existingGroup.id, { collapsed: tab.active ? false : collapseOnClick });
      }
      else {
        const existingGroupToCreate = groupExists(newTabName, groupsToCreate);
        if (existingGroupToCreate) {
          const index = groupsToCreate.indexOf(existingGroupToCreate);
          groupsToCreate[index].tabIds.push(tab.id);
          !groupsToCreate[index].hasActiveTab && (groupsToCreate[index].hasActiveTab = tab.active);
        }
        else {
          groupsToCreate.push({ title: newTabName, hasActiveTab: tab.active, tabIds: [tab.id] });
        }
      }
    });

    // .filter((el) => el.tabIds.length > 1)
    singlePageGroupIds = {hasActiveTab: false, groupids:[]};
    groupsToCreate.forEach(async (group) => {
      if (group.tabIds.length > 1) {
        const groupId = await chrome.tabs.group({ tabIds: group.tabIds });
        chrome.tabGroups.update(groupId, { title: group.title, collapsed: group.hasActiveTab ? false : collapseOnClick });
      }
      if (group.tabIds.length === 1) {
        singlePageGroupIds.hasActiveTab = group.hasActiveTab ? true : singlePageGroupIds.hasActiveTab;
        singlePageGroupIds.groupids.push(group.tabIds[0]);
      }
    });
    if (addSinglePagesToGroup) {
      const groupId = await chrome.tabs.group({ tabIds: singlePageGroupIds.groupids });
      chrome.tabGroups.update(groupId, { title: "everything else", collapsed: singlePageGroupIds.hasActiveTab ? false : collapseOnClick, color: "green" });
    }

    
  });
});


// //BUGFIX
// setTimeout(() => {
//   chrome.tabGroups.update(groupId, { collapsed: collapseOnClick });
// }, 500);    
// //BUGFIX