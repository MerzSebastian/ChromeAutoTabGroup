let collapseOnClick;
chrome.storage.sync.get(["collapseOnClick", "darkmode"], function (items) {
  collapseOnClick = items["collapseOnClick"] ? items["collapseOnClick"] : true;
  let darkmode = items["darkmode"] ? items["darkmode"] : true;
  const MenuOptions = [
    { id: 0, title: 'Collapse on click', status: collapseOnClick },
    { id: 1, title: 'Icon darkmode', status: darkmode },
  ];

  MenuOptions.forEach((option) => {
    chrome.contextMenus.create({
      id: option.id.toString(),
      title: option.title,
      type: "checkbox",
      checked: option.status,
      contexts: ['action'],
    })
  })
});

setAndSaveColor(true);
function setAndSaveColor(darkmode) {
  let color = darkmode ? "white" : "black";
  path = {
    "16": "icons/" + color + "/16.ico",
    "24": "icons/" + color + "/24.ico",
    "32": "icons/" + color + "/32.ico",
    "48": "icons/" + color + "/48.ico",
    "64": "icons/" + color + "/64.ico",
    "72": "icons/" + color + "/72.ico",
    "80": "icons/" + color + "/80.ico",
    "96": "icons/" + color + "/96.ico",
    "128": "icons/" + color + "/128.ico"
  };
  chrome.action.setIcon({ path: path });
  chrome.storage.sync.set({ "darkmode": darkmode }, function () { });
}


chrome.contextMenus.onClicked.addListener(contextClick);
function contextClick(info, tab) {
  console.log(info, tab);
  switch (info.menuItemId) {
    case "0":
      collapseOnClick = info.checked;
      chrome.storage.sync.set({ "collapseOnClick": info.checked }, function () { });
      break;
    case "1":
      setAndSaveColor(info.checked);
      break;
    default:
      break;
  }
}


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
                  ...(collapseOnClick ? { collapsed: collapsed } : {}),
                  title: group.name,
                });

                //BUGFIX
                await new Promise(resolve => setTimeout(resolve, 300));
                chrome.tabGroups.update(groupId, { ...(collapseOnClick ? { collapsed: collapsed } : {}) });
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
