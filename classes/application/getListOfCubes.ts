import catalogist from "catalogist";

export default function getListOfCubes(appDir: string): string[] {

  const cubeList = [];

  const appTree = catalogist.treeSync(appDir, {
    withSysRoot: true,
    childrenAlias: "next"
  });

  appTree.forEach(appLevel => {
    if (appLevel.next) {
      let cubeModuleFile = appLevel.name + '.js';
      if (!Utils.find(appLevel.next, {
          fullName: cubeModuleFile
        })) {
        return;
      }
      cubeList.push(appLevel.name);
    }
  });

  return cubeList;
}