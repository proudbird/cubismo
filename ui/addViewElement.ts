import path from 'path'
import Element from './UIElement'
import View from './View'

export default function addViewElement(view: View, node: any, options: any) {

  if (node && typeof node != 'function') {
    
    const element = node

    if (node.view && node.name && node.name !== 'data') {
      if (!node.id) {
        if (node.main || node.view === 'view') {
          node.id     = view.id
          node.viewId = view.id
        } else {
          node.id     = Utils.sid()
          node.viewId = view.id
        }
      }

      if (node.view === 'toolbar') {
        //defineToolbar(node, options)
      
      } else {
        let element = new Element(node)
        view.addElement(element)
      }
  }
  return node
  }
}

function defineToolbar(view, node, options) {

  if(node.composition === 'default') {
    let pathToDefaultCommandsFile = path.join(__dirname, './DefaultViews/Catalogs.List.Toolbar.Config.js')
    
    if (options.instance) {
      if(Utils.has(options.instance, node.owner)) {
        pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace('List', 'Collection')
      } else {
        pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace('List', 'Instance')
      }
    }

    const toolbar = require(pathToDefaultCommandsFile).init(node.owner, view.id)
    node.elements = toolbar

    let owner = view[node.owner]
    if (!owner) {
      Object.defineProperty(view, node.owner, {
        value: {},
        enumerable: true,
        writable: false
      })
    }

    Object.defineProperty(view[node.owner], node.name, {
      value: {
        config: node
      },
      enumerable: true,
      writable: false
    })
    
    let target = view[node.owner].Toolbar
    options.element = view[node.name]

    pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace('.Config', '')
    let commands = require(pathToDefaultCommandsFile)
    options.view = view
    options.element = target
    if (options.instance) {
      pathToDefaultCommandsFile = pathToDefaultCommandsFile.replace('List', 'Item')
      commands = require(pathToDefaultCommandsFile)
    }
    node.elements.forEach(command => {
      commands.defineCommand(command.name, options)
    })
  }
}