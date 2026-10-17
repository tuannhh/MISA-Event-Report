<script setup>
import {usePagination} from './pagination';
import ListPager from './ListPager.vue';
const props=defineProps({rows:{type:Array,default:()=>[]},all:Boolean});
const {page,pageSize,visibleRows,total,setPage,setPageSize}=usePagination(()=>props.rows,()=>props.all);
</script>
<template><div class="paged-records"><slot :rows="visibleRows"/><ListPager v-if="!all" :page="page" :page-size="pageSize" :total="total" @update:page="setPage" @update:page-size="setPageSize"/></div></template>
