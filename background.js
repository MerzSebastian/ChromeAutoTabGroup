let collapseOnClick = false;
chrome.storage.sync.get(["collapseOnClick", "toggleIcon"], function(items){
  console.log(items);
  const MenuOptions = [
    {id: 0, title: 'Collapse on click', status: items["collapseOnClick"] ? items["collapseOnClick"] : true},
    {id: 1, title: 'Icon darkmode', status: items["toggleIcon"] ? items["toggleIcon"] : true},
  ];
  collapseOnClick = MenuOptions[0].status;
  
  MenuOptions.forEach((option)=>{
    chrome.contextMenus.create({
      id: option.id.toString(),
      title: option.title,
      type: "checkbox",
      checked: option.status,
      contexts: ['action'],
    })
  })
});

function contextClick(info, tab) {
  switch (info.menuItemId) {
    case "0":
      collapseOnClick = info.checked;
      chrome.storage.sync.set({ "collapseOnClick": info.checked }, function() { });
      break;
    case "1":
      chrome.action.setIcon(
        info.checked ? 
        { path: {
          "16": "icons/white/16.ico",
          "24": "icons/white/24.ico",
          "32": "icons/white/32.ico",
          "48": "icons/white/48.ico",
          "64": "icons/white/64.ico",
          "72": "icons/white/72.ico",
          "80": "icons/white/80.ico",
          "96": "icons/white/96.ico",
          "128": "icons/white/128.ico"
        } }: 
        { path: {
          "16": "icons/black/16.ico",
          "24": "icons/black/24.ico",
          "32": "icons/black/32.ico",
          "48": "icons/black/48.ico",
          "64": "icons/black/64.ico",
          "72": "icons/black/72.ico",
          "80": "icons/black/80.ico",
          "96": "icons/black/96.ico",
          "128": "icons/black/128.ico"
        } }
      );
      chrome.storage.sync.set({ "toggleIcon": info.checked }, function() { });
      break;
  
    default:
      break;
  }
}
chrome.contextMenus.onClicked.addListener(contextClick)


chrome.action.onClicked.addListener(async (tab) => {
  let groups = [];
  let tabExists = (name) => {
    return groups.map((el) => el.name === name).includes(true);
  };

  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (currentActiveTab) {
      chrome.tabs.query({}, async function (tabs) {

        //create tab group if necessary
        tabs.forEach((element) => {
          let newTabName = element.url.match(
            /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n\?\=]+)/
          );
          newTabName = newTabName ? newTabName[1] : element.url; //fallback if name cannot be resolved
          tabExists(newTabName)
            ? groups.forEach((currElement, index) => {
                currElement.name === newTabName &&
                  groups[index].values.push(element.id);
              })
            : groups.push({ name: newTabName, values: [element.id] });
        });

        //sort tabs into groups if needed
        groups.forEach(async (group) => {
          if (group.values.length > 1) {
            chrome.tabGroups.query(
              { title: group.name },
              async function (tabGroups) {
                var groupId = 0;
                if (tabGroups.length == 0) {
                  groupId = await chrome.tabs.group({ tabIds: group.values });
                } else {
                  groupId = tabGroups[0].id;
                  chrome.tabs.group({ groupId: groupId, tabIds: group.values });
                }
                var collapsed = group.values.includes(currentActiveTab[0].id) ? false : true;
                chrome.tabGroups.update(groupId, {
                  ...(collapseOnClick ? {collapsed: collapsed} : {}),
                  title: group.name,
                });

                //BUGFIX
                await new Promise(resolve => setTimeout(resolve, 300));
                chrome.tabGroups.update(groupId, {...(collapseOnClick ? {collapsed: collapsed} : {})});
                //BUGFIX
              }
            );
          } else {
            chrome.tabs.move(group.values[0], { index: -1 });
          }
        });
      });
    }
  );
});
