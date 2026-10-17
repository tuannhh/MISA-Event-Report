<script setup>
import {computed} from 'vue';
import {PAGE_SIZES} from './pagination';
import MButton from './mds/MButton.vue';
import MIcon from './mds/MIcon.vue';
const props=defineProps({page:{type:Number,default:1},pageSize:{type:Number,default:20},total:{type:Number,default:0},loading:Boolean});
const emit=defineEmits(['update:page','update:pageSize']);
const last=computed(()=>Math.max(1,Math.ceil(props.total/props.pageSize)));
const first=computed(()=>props.total?(props.page-1)*props.pageSize+1:0);
const format=n=>n.toLocaleString('vi-VN');
function resize(event){emit('update:pageSize',Number(event.target.value));emit('update:page',1);}
</script>
<template><nav class="list-pager" aria-label="Phân trang"><span class="muted">Tổng số: <strong>{{format(total)}}</strong></span><div class="row"><label class="row">Số dòng/trang <select aria-label="Số dòng/trang" :value="pageSize" :disabled="loading" @change="resize"><option v-for="size in PAGE_SIZES" :key="size" :value="size">{{size}}</option></select></label><strong aria-live="polite">{{format(first)}} – {{format(Math.min(page*pageSize,total))}}</strong><div class="row"><MButton variant="icon" title="Về trang đầu" aria-label="Về trang đầu" :disabled="loading||page<=1" @click="emit('update:page',1)"><MIcon name="chevrons-left" :size="16"/></MButton><MButton variant="icon" title="Trang trước" aria-label="Trang trước" :disabled="loading||page<=1" @click="emit('update:page',page-1)"><MIcon name="chevron-left" :size="16"/></MButton><MButton variant="icon" title="Trang sau" aria-label="Trang sau" :disabled="loading||page>=last" @click="emit('update:page',page+1)"><MIcon name="chevron-right" :size="16"/></MButton><MButton variant="icon" title="Về trang cuối" aria-label="Về trang cuối" :disabled="loading||page>=last" @click="emit('update:page',last)"><MIcon name="chevrons-right" :size="16"/></MButton></div></div></nav></template>
<style scoped>
.list-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:8px 12px;border-top:1px solid var(--mds-border);background:var(--mds-bg);font-size:13px;border-radius:0 0 8px 8px}.list-pager .row{gap:8px;flex-wrap:wrap}.list-pager select{width:72px;min-height:36px;padding:4px 8px;border:1px solid var(--mds-border);border-radius:4px;background:var(--mds-bg);color:var(--mds-text)}.list-pager select:focus-visible{outline:2px solid var(--mds-brand)}
</style>
