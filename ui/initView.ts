import fs     from 'fs'
import path   from 'path'
import demand from 'demander'

import View from './View';
import addViewElement from './addViewElement'

export default function initView(view: View, config: any, options: any) {

  Utils.traverse(config, function (node) {
    addViewElement(view, node, options)
  })
}