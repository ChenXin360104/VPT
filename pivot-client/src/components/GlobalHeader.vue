<template>
  <nav class="navbar navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">
       
       PIVOT
      </a>

      <a href="https://docs.google.com/document/d/1RNhzro4HdUa7a9yOhelKUNIHlXKW6bUfBO6MKaLJH7E/edit?usp=sharing">user guide</a>
    
      <!-- <button type="button" class="btn btn-secondary" @click.prevent="openImportPanel">ImportData</button> -->
    </div>
   
  </nav>
</template>
<script>
import { defineComponent, ref } from "vue";
export default defineComponent({
  name: "GlobalHeader",
  components: {},
  props: {},
  setup() {
    const isVisible = ref(false);
    const closePanel = () => {
      isVisible.value = !isVisible.value;
    };
    const openImportPanel=()=>{
      isVisible.value=true
    }
    return {
      isVisible,
      closePanel,
      openImportPanel
    };
  },
});
</script>
<style scoped>
.navbar{
  min-width: 1520px;
}
</style>