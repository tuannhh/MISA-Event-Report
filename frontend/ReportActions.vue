<script setup>
import {computed} from 'vue';
import {s,refreshLatest} from './store';
const props=defineProps({filtersOpen:Boolean,metadataOpen:Boolean});
const emit=defineEmits(['update:filtersOpen','update:metadataOpen']);
const count=computed(()=>Object.values(s.filters).filter(v=>v&&v!=='all').length+Object.keys(s.sources).length);
</script>
<template><div class="report-actions" aria-label="Thao tác báo cáo"><MCheckbox v-if="s.reportTab!=='targets'" v-model="s.showPercent" label="Hiển thị % trên biểu đồ"/><MButton variant="secondary" :aria-expanded="filtersOpen" aria-controls="report-filters" @click="emit('update:filtersOpen',!filtersOpen)">Bộ lọc báo cáo<span v-if="count"> ({{count}})</span></MButton><MButton variant="link" :disabled="!s.report||s.reportBusy" :aria-expanded="metadataOpen" aria-controls="report-metadata" @click="emit('update:metadataOpen',!metadataOpen)">Thông tin dữ liệu</MButton><MButton v-if="!s.filters.snapshot" variant="secondary" :loading="s.refreshBusy" :disabled="s.reportBusy" @click="refreshLatest">Cập nhật ngay</MButton></div></template>
