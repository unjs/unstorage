<template>
  <div class="filetree">
    <file-tree-node :item="tree" @open="(path) => $emit('open', path)" />
  </div>
</template>

<script>
import { defineComponent, inject, ref } from "vue";
import FileTreeNode from "./FileTreeNode.vue";

function unflattenArray(items, toplevelKey = "root") {
  const res = { name: toplevelKey, path: "", children: [] };
  for (const item of items) {
    const split = item.split(":");
    let target = res;
    for (const name of split) {
      let child = target.children.find((c) => c.name === name);
      if (!child) {
        child = {
          name,
          path: target.path + ":" + name,
          children: [],
        };
        target.children.push(child);
        target.children = target.children.sort((c1, c2) =>
          c1.name.localeCompare(c2.name)
        );
      }
      target = child;
    }
    target.path = item;
  }
  return res;
}

export default defineComponent({
  components: { FileTreeNode },
  async setup() {
    const storage = inject("storage");
    const tree = ref([]);
    await storage.getKeys().then((_keys) => {
      tree.value = unflattenArray(_keys, "workspace");
    });
    return {
      tree,
    };
  },
});
</script>

<style scoped>
.filetree {
  min-width: 300px;
  overflow-y: scroll;
}
</style>
