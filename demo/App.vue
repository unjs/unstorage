<template>
  <Suspense>
    <div class="container">
      <FileTree @open="openTab" />
      <div class="main">
        <div class="tabs">
          <div
            v-for="tab in state.tabs"
            :key="tab.path"
            class="tab"
            :class="{ active: state.path === tab.path }"
          >
            <span @click="openTab(tab.path)">{{ tab.name }} </span
            ><span @click="closeTab(tab.path)">(x)</span>
          </div>
        </div>
        <Editor
          class="editor"
          :value="state.source"
          :language="state.language"
        />
      </div>
    </div>
  </Suspense>
</template>

<script>
import { defineComponent, reactive, inject } from "vue";
import Editor from "./Editor.vue";
import FileTree from "./FileTree.vue";

export default defineComponent({
  components: {
    Editor,
    FileTree,
  },
  setup() {
    const storage = inject("storage");
    const state = reactive({
      tabs: [],
      path: undefined,
      source: "",
      language: "javascript",
    });

    const openTab = async (path) => {
      const tab = state.tabs.find((tab) => tab.path === path);
      if (!tab) {
        state.tabs.push({
          name: path.split(":").pop(),
          path,
        });
      }
      const source = await storage.getItem(path);
      state.language = path.split(":").pop().split(".").pop() || "javascript";
      state.path = path;
      state.source = source;
    };

    const closeTab = (path) => {
      state.tabs = state.tabs.filter((t) => t.path !== path);
    };

    return {
      state,
      openTab,
      closeTab,
    };
  },
});
</script>

<style>
body,
html,
#app {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: white;
  background: #2c3e50;
  overflow: hidden;
}

.container {
  display: flex;
  min-height: 100vh;
  max-height: 100vh;
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.editor {
  flex: 1;
}

.tabs {
  display: flex;
  min-height: 2em;
}

.tab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2em;
  cursor: pointer;
}

.tab.active {
  background: blue;
}
</style>
