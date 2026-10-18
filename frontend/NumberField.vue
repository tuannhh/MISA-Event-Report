<script setup>
import {computed} from 'vue';import {number} from './store';const p=defineProps({modelValue:{type:[Number,String],default:0},disabled:Boolean});const emit=defineEmits(['update:modelValue']);const text=computed(()=>p.modelValue===''||p.modelValue==null?'':number(p.modelValue));function update(v){const raw=String(v).replace(/\./g,'').replace(',','.');emit('update:modelValue',raw===''?'':Number(raw));}
</script><template><MInput :model-value="text" :disabled="disabled" @update:model-value="update" /></template>
