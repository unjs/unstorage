<template>
  <div ref="editor" class="editor" />
</template>

<script>
import { defineComponent } from 'vue'
import * as monaco from 'monaco-editor'

export default defineComponent({
  props: {
    value: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: 'auto'
    }
  },
  watch: {
    value (newValue) {
      this.editor.setValue(newValue)
    },
    language (newValue) {
      this.editor.setModelLanguage(this.editor.getModule(), newValue)
    }
  },
  mounted () {
    this.editor = monaco.editor.create(this.$refs.editor, {
      value: this.value,
      language: this.language
    })
  }
})
</script>

<style scoped>
.editor {
  flex: 1;
}
</style>
