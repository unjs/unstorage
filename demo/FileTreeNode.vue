<template>
  <li class="filetree-node">
    <div @click="onOpen">
      {{ item.name }} <span v-if="isDirectory">[{{ isOpen ? '-' : '+' }}]</span>
    </div>
    <ul v-if="isOpen && item.children.length">
      <file-tree-node
        v-for="child of item.children"
        :key="child.name"
        :item="child"
        @open="path => $emit('open', path)"
      />
    </ul>
  </li>
</template>

<script>
import { defineComponent, ref } from 'vue'

export default defineComponent({
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  setup (props) {
    return {
      isOpen: ref((props.item.path || '').split(':').length < 3)
    }
  },
  computed: {
    isDirectory () {
      return this.item.children.length
    }
  },
  methods: {
    onOpen () {
      if (this.isDirectory) {
        this.isOpen = !this.isOpen
      } else {
        this.$emit('open', this.item.path)
      }
    }
  }
})
</script>

<style scoped>
.filetree-node {
  cursor: pointer;
}
</style>
