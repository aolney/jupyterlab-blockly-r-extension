import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';
import { INotebookTracker, NotebookPanel } from "@jupyterlab/notebook";
import { Cell } from "@jupyterlab/cells";
import * as Blockly from 'blockly/core';
// import  RGenerator  from './RGenerator.js';
import { ICommandPalette, MainAreaWidget , IWidgetTracker, ISessionContext, WidgetTracker } from '@jupyterlab/apputils';
import { IStateDB } from "@jupyterlab/statedb";
import * as notebook_1 from "@jupyterlab/notebook";
import * as cells from "@jupyterlab/cells";
import { ICellModel } from "@jupyterlab/cells";
import { Kernel, Session, KernelMessage } from "@jupyterlab/services";
import { DocumentRegistry } from "@jupyterlab/docregistry";
import { CommandRegistry } from "@lumino/commands";


import { toolbox, encodeWorkspace, decodeWorkspace, setNotebooksInstance as notebooks_1, DoFinalInitialization, UpdateAllIntellisense_R } from "./Toolbox.js";

import { RGenerator } from './RGenerator';


export class BlocklyWidget extends Widget {
  readonly notebooks: INotebookTracker;
  readonly generator: any;
  "lastCell@": Cell;
  "blocksRendered@": boolean;
  "workspace@": Blockly.Workspace;
  "notHooked@": boolean;
  "init@37": number;
  constructor(notebooks: INotebookTracker) {
    super();
    this.notebooks = notebooks;
    this.generator = RGenerator;
    this.notebooks.activeCellChanged.connect(BlocklyWidget__get_onActiveCellChanged(this), this);
    notebooks_1(this.notebooks);
    const div: any = document.createElement("div");
    div.setAttribute("style", "height: 480px; width: 600px;");
    div.id = "blocklyDivR";
    this.node.appendChild(div);
    const buttonDiv: any = document.createElement("div");
    buttonDiv.id = "buttonDivR";
    const blocksToCodeButton: any = document.createElement("button");
    blocksToCodeButton.innerText = "Blocks to Code";
    blocksToCodeButton.addEventListener("click", (_arg: any): void => {
      BlocklyWidget__RenderCode(this);
    });
    buttonDiv.appendChild(blocksToCodeButton);
    const codeToBlocksButton: any = document.createElement("button");
    codeToBlocksButton.innerText = "Code to Blocks";
    codeToBlocksButton.addEventListener("click", (_arg_1: any): void => {
      BlocklyWidget__RenderBlocks(this);
    });
    buttonDiv.appendChild(codeToBlocksButton);
    const bugReportButton: any = document.createElement("button");
    bugReportButton.innerText = "Report Bug";
    bugReportButton.addEventListener("click", (_arg_2: any): void => {
      const win: any = window.open("https://github.com/aolney/jupyterlab-blockly-r-extension/issues", "_blank");
      win.focus();
    });
    buttonDiv.appendChild(bugReportButton);
    const syncCheckbox: any = document.createElement("input");
    syncCheckbox.setAttribute("type", "checkbox");
    syncCheckbox.checked = true;
    syncCheckbox.id = "syncCheckboxR";
    const syncCheckboxLabel: any = document.createElement("label");
    syncCheckboxLabel.innerText = "Notebook Sync";
    syncCheckboxLabel.setAttribute("for", "syncCheckboxR");
    buttonDiv.appendChild(syncCheckbox);
    buttonDiv.appendChild(syncCheckboxLabel);
    const cacheCheckbox: any = document.createElement("input");
    cacheCheckbox.setAttribute("type", "checkbox");
    cacheCheckbox.id = "cacheCheckboxR";
    cacheCheckbox.onchange = ((e: any): void => {
      const url: string = window.location.href;
      if ((e.currentTarget as any).checked) {
        if (!(url.indexOf("workspaces/cache") >= 0)) {
          const parts = url.split("/lab");
          const newUrl = parts[0] + "/lab/workspaces/cache" + parts[1];
          window.location.assign(newUrl);
        }
      }
      else {
        const baseUrl: string = url.slice(0, url.indexOf("/lab"));
        window.location.assign(baseUrl + "/lab/workspaces/cache?reset");
      }
    });
    cacheCheckbox.checked = true;
    cacheCheckbox.dispatchEvent(new Event("change"));
    const cacheCheckboxLabel: any = document.createElement("label");
    cacheCheckboxLabel.innerText = "Use cache";
    cacheCheckboxLabel.setAttribute("for", "cacheCheckboxR");
    buttonDiv.appendChild(cacheCheckbox);
    buttonDiv.appendChild(cacheCheckboxLabel);
    this.node.appendChild(buttonDiv);
    // this["lastCell@"] = defaultOf();
    this["blocksRendered@"] = false;
    // this["workspace@"] = defaultOf();
    this["notHooked@"] = true;
    this["init@37"] = 1;
  }
  onAfterAttach(): void {
    const this$: BlocklyWidget = this;
    BlocklyWidget__set_workspace(this$, Blockly.inject("blocklyDivR", {
      toolbox: toolbox,
    }));
    console.log("jupyterlab_blockly_extension_r: blockly palette initialized");
    const logListener = (e: Blockly.Events.Abstract): void => {
      if (e.type === "create") {
        BlocklyWidget__set_blocksRendered(this$, false);
      }
      if (e.type === "finished_loading") {
        BlocklyWidget__set_blocksRendered(this$, true);
      }
      // LogToServer(BlocklyLogEntry082720_Create<Blockly_Events_Abstract__Class>(e.type, e));
    };
    BlocklyWidget__get_workspace(this$).removeChangeListener(logListener);
    BlocklyWidget__get_workspace(this$).addChangeListener(logListener);
    DoFinalInitialization(BlocklyWidget__get_workspace(this$) as Blockly.WorkspaceSvg);
  }
  onResize(msg: Widget.ResizeMessage): void {
    let copyOfStruct: number, copyOfStruct_1: number;
    const this$: BlocklyWidget = this;
    const blocklyDiv: any = document.getElementById("blocklyDivR");
    const buttonDiv: any = document.getElementById("buttonDivR");
    const adjustedHeight: number = msg.height - 30;
    blocklyDiv.setAttribute("style", ((("position: absolute; top: 0px; left: 0px; width: " + ((copyOfStruct = msg.width, copyOfStruct.toString()))) + "px; height: ") + adjustedHeight.toString()) + "px");
    buttonDiv.setAttribute("style", ((((((("position: absolute; top: " + adjustedHeight.toString()) + "px; left: ") + "0") + "px; width: ") + ((copyOfStruct_1 = msg.width, copyOfStruct_1.toString()))) + "px; height: ") + "30") + "px");
    Blockly.svgResize(BlocklyWidget__get_workspace(this$) as Blockly.WorkspaceSvg);
  }
}

export function BlocklyWidget__set_workspace(__: BlocklyWidget, v: Blockly.Workspace): void {
  __["workspace@"] = v;
}

export function BlocklyWidget__get_workspace(__: BlocklyWidget): Blockly.Workspace {
  return __["workspace@"];
}

export function BlocklyWidget__get_Notebooks(this$: BlocklyWidget): INotebookTracker {
  return this$.notebooks;
}

export function BlocklyWidget_factor(notebooks: INotebookTracker): BlocklyWidget {
  return new BlocklyWidget(notebooks);
}

export function BlocklyWidget__set_blocksRendered(__: BlocklyWidget, v: boolean): void {
  __["blocksRendered@"] = v;
};

export function BlocklyWidget__get_blocksRendered(__: BlocklyWidget): boolean {
  return __["blocksRendered@"];
};

export function BlocklyWidget__get_notHooked(__: BlocklyWidget): boolean {
  return __["notHooked@"];
};

export function BlocklyWidget__set_notHooked(__: BlocklyWidget, v: boolean): void {
  __["notHooked@"] = v;
};

export function BlocklyWidget__get_lastCell(__: BlocklyWidget): Cell {
  return __["lastCell@"];
};

export function BlocklyWidget__set_lastCell(__: BlocklyWidget, v: Cell): void {
  __["lastCell@"] = v;
}

/**
 * Refresh intellisense when kernel executes
 */
export function BlocklyWidget__get_onKernelExecuted(this$: BlocklyWidget): ((arg0: Kernel.IKernelConnection, arg1: KernelMessage.IIOPubMessage<any>) => boolean) {
  return (sender: Kernel.IKernelConnection, args: KernelMessage.IIOPubMessage<any>): boolean => {
    if (sender.name === "ir") {
      const messageType: string = args.header.msg_type.toString();
      switch (messageType) {
        case "execute_input": {
          console.log("jupyterlab_blockly_extension_python: kernel executed code, updating intellisense");
          // LogToServer(JupyterLogEntry082720_Create("execute-code", args.content.code));
          UpdateAllIntellisense_R();
          break;
        }
        case "error": {
          // LogToServer(JupyterLogEntry082720_Create("execute-code-error", JSON.stringify(args.content)));
          break;
        }
        default: 0;
      }
    }
    return true;
  };
};

export function BlocklyWidget__get_onActiveCellChanged(this$: BlocklyWidget): (arg0: INotebookTracker, arg1: Cell<ICellModel> | null) => boolean {
  return (sender: INotebookTracker, args: Cell<ICellModel> | null): boolean => {
    if(args){
      // LogToServer(JupyterLogEntry082720_Create("active-cell-change", args.node.outerText));
      const syncCheckbox: HTMLElement | null = document.getElementById("syncCheckboxR");
      const autosaveCheckbox: HTMLElement | null = document.getElementById("autosaveCheckbox");

      const isChecked = (aCheckbox: any): boolean => {
        if (aCheckbox) {
          return aCheckbox.checked;
        }
        else {
          return false;
        }
      }
      if (isChecked(syncCheckbox) && this$.notebooks.activeCell) {
        if (BlocklyWidget__get_blocksRendered(this$) && BlocklyWidget__ActiveCellSerializedBlocksWorkspaceOption(this$) == null) {
          BlocklyWidget__clearBlocks(this$);
        }
        else {
          BlocklyWidget__RenderBlocks(this$);
        }
        UpdateAllIntellisense_R();
      }
      if (isChecked(autosaveCheckbox) && this$.notebooks.activeCell) {
        BlocklyWidget__RenderCodeToLastCell(this$);
        BlocklyWidget__set_lastCell(this$, args);
      }

    }
      return true;
  };
};

export function BlocklyWidget__ActiveCellSerializedBlocksWorkspaceOption(this$: BlocklyWidget): string | null {
  if (this$.notebooks.activeCell) {
    const xmlString: string = this$.notebooks.activeCell.model.sharedModel.getSource();
    if (xmlString.indexOf("xmlns") >= 0) {
      const regex = /(<xml[\s\S]+<\/xml>)/;
      let xmlStringOption = xmlString.match(regex);
      if(xmlStringOption && xmlStringOption[0]){
        return xmlStringOption[0]
      }
    }
    else {
      return null;
    }
  }
  return null;
};

/**
 * Render blocks to code
 */
export function BlocklyWidget__RenderCode(this$: BlocklyWidget): void {
  let model: ICellModel;
  const code: string = this$.generator.workspaceToCode(BlocklyWidget__get_workspace(this$));
  if(this$.notebooks.activeCell){
    if ((model = this$.notebooks.activeCell.model, cells.isMarkdownCellModel(model))) {
      window.alert("You are calling \'Blocks to Code\' on a MARKDOWN cell. Select an empty CODE cell and try again.");
    }
    else {
      this$.notebooks.activeCell.model.sharedModel.setSource(code + "\n#" + encodeWorkspace());
      console.log(("jupyterlab_blockly_extension_python: wrote to active cell\n" + code) + "\n");
      // LogToServer(JupyterLogEntry082720_Create("blocks-to-code", this$.notebooks.activeCell.model.value.text));
      BlocklyWidget__set_blocksRendered(this$, true);
    }
  }
  else {
    console.log(("jupyterlab_blockly_extension_python: no cell active, flushed\n" + code) + "\n");
  }
};

/**
 * Render blocks in workspace using xml. Defaults to xml present in active cell
 */
export function BlocklyWidget__RenderBlocks(this$: BlocklyWidget): void {
  if(this$.notebooks.activeCell){
    const xmlString: string = this$.notebooks.activeCell.model.sharedModel.getSource();
    const regex = /(<xml[\s\S]+<\/xml>)/;
    let xmlStringOption = xmlString.match(regex);
    try {
      if(xmlStringOption && xmlStringOption[1]){
        const xmlString: string = xmlStringOption[1];
        BlocklyWidget__clearBlocks(this$);
        decodeWorkspace(xmlString);
        // LogToServer(JupyterLogEntry082720_Create("xml-to-blocks", xmlString));
      }
    } catch (e: any) {
      window.alert("Unable to perform \'Code to Blocks\': XML is either invald or renames existing variables. Specific error message is: " + e.message);
      console.log("jupyterlab_blockly_extension_python: unable to decode blocks, last line is invald xml");
    }
  }
  else {
    console.log("jupyterlab_blockly_extension_python: unable to decode blocks, active cell is null");
  }
};

/**
 * Auto-save: Render blocks to code if we are on a code cell, we've previously saved to it, and have any blocks on the workspace
 */
export function BlocklyWidget__RenderCodeToLastCell(this$: BlocklyWidget): void {
  let model: ICellModel;
  const code: string = this$.generator.workspaceToCode(BlocklyWidget__get_workspace(this$));
  if (BlocklyWidget__get_lastCell(this$)) {
    if (BlocklyWidget__get_lastCell(this$).model) {
      if ((model = BlocklyWidget__get_lastCell(this$).model, cells.isCodeCellModel(model))) {
        if ((() => {
          try {
            const xmlString: string = BlocklyWidget__get_lastCell(this$).model.sharedModel.getSource();
            if (xmlString.indexOf("xmlns") >= 0) {
              const regex = /(<xml[\s\S]+<\/xml>)/;
              let xmlStringOption = xmlString.match(regex);
              if(xmlStringOption && xmlStringOption[0]){
                return xmlStringOption[0]
              }
            }
          }
          catch (matchValue: any) {
              return false;
          }
        })()) {
          // const workspace: Blockly.Workspace = BlocklyWidget__get_workspace(this$);
          const blocks: Blockly.Block[] = BlocklyWidget__get_workspace(this$).getAllBlocks(false);
          if (blocks.length > 0) {
            BlocklyWidget__get_lastCell(this$).model.sharedModel.setSource(code + "\n#" + encodeWorkspace());
            console.log(("jupyterlab_blockly_extension_python: wrote to active cell\n" + code) + "\n");
            // LogToServer(JupyterLogEntry082720_Create("blocks-to-code-autosave", this$.notebooks.activeCell.model.value.text));
          }
        }
      }
    }
  }
  else {
    console.log(("jupyterlab_blockly_extension_python: no cell active, flushed instead of autosave\n" + code) + "\n");
  }
};

export function BlocklyWidget__clearBlocks(this$: BlocklyWidget): void {
  const workspace: Blockly.Workspace = Blockly.getMainWorkspace();
  const blocks = workspace.getAllBlocks(false);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    block.dispose(false);
  }
}

/**
 * Return a MainAreaWidget wrapping a BlocklyWidget
 */
export function createMainAreaWidget<BlocklyWidget>(bw: BlocklyWidget): MainAreaWidget {
  const w: MainAreaWidget = new MainAreaWidget({
    content: bw as any,
  });
  w.id = "blockly-jupyterlab-r";
    w.title.label = "Blockly R";
  w.title.closable = true;
  return w;
};

/**
 * Attach a MainAreaWidget by splitting the viewing area and placing in the left hand pane, if possible
 */
export function attachWidget(app: JupyterFrontEnd, notebooks: INotebookTracker, widget: MainAreaWidget): void {
  if (!widget.isAttached) {
    const matchValue: NotebookPanel | null = notebooks.currentWidget;
    if (matchValue == null) {
      app.shell.add(widget, "main");
    }
    else {
      const c: NotebookPanel = matchValue;
      const options: DocumentRegistry.IOpenOptions = {
        ref: c.id,
        mode: "split-left",
      };
      c.context.addSibling(widget, options);
    }
  }
  app.shell.activateById(widget.id);
};

export const runCommandOnNotebookChanged = function(this: any, sender: IWidgetTracker<NotebookPanel>, args: NotebookPanel | null): boolean{
  const matchValue = sender.currentWidget;
  if (matchValue == null) {}
  else {
    console.log("jupyterlab_blockly_extension_r: notebook changed, autorunning blockly r command");
    this.commands.execute("blockly_r:open");
  }
  return true;
};

export function onKernelChanged(this: any, sender: ISessionContext, args: Session.ISessionConnection.IKernelChangedArgs): boolean{
  const widget: BlocklyWidget = this;
  if (BlocklyWidget__get_notHooked(widget)) {
    const matchValue: Kernel.IKernelConnection | null | undefined = sender.session?.kernel;
    if (matchValue == null || matchValue == undefined) {}
    else {
      const kernel: Kernel.IKernelConnection = matchValue;
      if (kernel.name === "ir") {
        const ikernel = kernel as Kernel.IKernelConnection;
        ikernel.iopubMessage.connect(BlocklyWidget__get_onKernelExecuted(widget), widget);
        console.log("jupyterlab_blockly_extension_r: Listening for kernel messages");
        BlocklyWidget__set_notHooked(widget, false);
      }
    }
    return true;
  }
  else {
    return false;
  }
};

export function onNotebookChanged(this: any, sender: IWidgetTracker<NotebookPanel>, args: NotebookPanel | null): boolean{
  const blocklyWidget: BlocklyWidget = this;
  const matchValue: NotebookPanel | null = sender.currentWidget;
  if (matchValue == null) {}
  else {
    const notebook: NotebookPanel = matchValue;
    console.log("jupyterlab_blockly_extension_r: notebook changed to " + notebook.context.path);
    // LogToServer(JupyterLogEntry082720_Create("notebook-changed", notebook.context.path));
    notebook.sessionContext.kernelChanged.connect(onKernelChanged, blocklyWidget);
  }
  return true;
};


const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_blockly_extension_r',
  autoStart: true,
  requires: [ICommandPalette, notebook_1.INotebookTracker, ILayoutRestorer, IStateDB],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, notebooks: INotebookTracker, restorer: ILayoutRestorer, state: IStateDB) => {
    console.log("jupyterlab_blockly_extension_r: activated");

    const blocklyWidget: BlocklyWidget = BlocklyWidget_factor(notebooks);
    let widget: MainAreaWidget<any> = createMainAreaWidget<any>(blocklyWidget);
    
    const tracker: WidgetTracker<MainAreaWidget<any>> = new WidgetTracker({
      namespace: "blockly_r",
    });
    if(restorer){
      restorer.restore(tracker, {
        command: "blockly_r:open",
        name: (): string => "blockly_r",
      });
    }

    app.restored.then<Promise<void>>((): Promise<void> => state.fetch("jupyterlab_blockly_extension_r:intellisense-cache").then<void>((value_1: any): void => {
      if (value_1 == null) {}
      else {
        const obj: any = value_1;
        console.log("Loaded intellisense cache with... ");
        const keys: string[] = Object.keys(obj);
        for (let idx = 0; idx <= (keys.length - 1); idx++) {
          const key: string = keys[idx];
          console.log(key);
        }
        if (keys.length > 0) {
          // RestoreIntellisenseCacheFromStateDB(obj);
        }
        console.log("...done");
      }
    }));

    /*
    const cacheTimer = 120000;
    setInterval(() => {
      state.save("jupyterlab_blockly_extension_r:intellisense-cache", IntellisenseCacheToJson())
        .then(() => console.log("Saved intellisense cache to stateDB"))
        .catch(() => console.log("FAILED to save intellisense cache to stateDB"));

      state.toJSON().then(db => {
        console.log("as ", db);
      });
    }, cacheTimer);
    */

    notebooks.currentChanged.connect(onNotebookChanged, blocklyWidget);
    app.commands.addCommand("blockly_r:open", {
      label: "Blockly R",
      execute: (): void => {
        if (!widget ? true : widget.isDisposed) {
          widget = createMainAreaWidget<any>(blocklyWidget);
        }
        attachWidget(app, notebooks, widget);
        if (!tracker.has(widget)) {
          tracker.add(widget);
        }
      },
    } as CommandRegistry.ICommandOptions);

    palette.addItem({ command: "blockly_r:open", category: 'Blockly' });

    const searchParams: any = new URLSearchParams(window.location.search);
    const matchValue: string | null = searchParams.get("bl");
    let matchResult: number;
    if (matchValue) {
      if (matchValue === "r") {
        matchResult = 0;
      }
      else {
        matchResult = 1;
      }
    }
    else {
      matchResult = 1;
    }
    switch (matchResult) {
      case 0: {
        console.log("jupyterlab_blockly_extension_r: triggering open command based on query string input");
        app.restored.then<void>((): void => {
          notebooks.currentChanged.connect(runCommandOnNotebookChanged, app);
          widget.title.closable = false;
        });
        break;
      }
    }

    /*  logging
    const matchValue_1: string | null = searchParams.get("id");
    if (matchValue_1) {
      idOption(matchValue_1);
    }*/

    const matchValue_2: string | null = searchParams.get("log");
    const matchValue_3: string | null = searchParams.get("logr");
    let matchResult_1: number;
    // let logUrl: string;
    if (matchValue_2) {
      if (matchValue_3) {
        if (matchValue_3 === "1") {
          matchResult_1 = 0;
          // logUrl = matchValue_2;
        }
        else {
          matchResult_1 = 1;
        }
      }
      else {
        matchResult_1 = 1;
      }
    }
    else {
      matchResult_1 = 1;
    }
    switch (matchResult_1) {
      case 0: {
        // logUrl_1(logUrl!);
        break;
      }
      case 1: {
        break;
      }
    }

  }
};

export default plugin;