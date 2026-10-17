<script setup>
import {ref,computed} from 'vue';
import {s,sourceValue,resetFilters,number,dateText,modeOptions} from './store';
const open=ref(false);
const count=computed(()=>Object.values(s.filters).filter(v=>v&&v!=='all').length+Object.keys(s.sources).length);
</script>
<template><section aria-label="Bộ lọc báo cáo"><div class="toolbar filter-toggle"><span class="muted">{{count?`Đang áp dụng ${count} điều kiện lọc`:'Toàn bộ dữ liệu mới nhất'}}</span><div class="row"><MButton v-if="count" variant="link" @click="resetFilters">Xóa bộ lọc</MButton><MButton variant="secondary" :aria-expanded="open" aria-controls="report-filters" @click="open=!open">{{open?'Thu gọn bộ lọc':'Bộ lọc báo cáo'}}<span v-if="count"> ({{count}})</span></MButton></div></div><div v-if="open" id="report-filters" class="card stack">
<div class="grid-form"><label class="field">Từ ngày submit<MDatePicker v-model="s.filters.from" /></label><label class="field">Đến ngày submit<MDatePicker v-model="s.filters.to" /></label><label class="field">So sánh từ ngày<MDatePicker v-model="s.filters.compareFrom" /></label><label class="field">So sánh đến ngày<MDatePicker v-model="s.filters.compareTo" /></label>
<label class="field">Phiên dữ liệu<MCombobox v-model="s.filters.snapshot" :options="[{value:'',label:'Bản mới nhất'},...s.snapshots.map(v=>({value:v.id,label:dateText(v.created_at)+' · '+v.label}))]" /></label>
<label v-if="s.event?.mode==='hybrid'" class="field">Hình thức tham dự<MSelect v-model="s.filters.mode" :options="[{value:'all',label:'Tất cả hình thức'},...modeOptions.filter(o=>['online','offline'].includes(o.value))]" /></label></div>
<div><h3>Lọc theo nguồn, nhân viên</h3><p class="muted">Mặc định tổng hợp toàn bộ dữ liệu mới nhất. Chọn thời gian, nguồn hoặc nhân viên khi cần xem chi tiết. Tự cập nhật KPI, bảng, biểu đồ và bản xuất. Các điều kiện được kết hợp đồng thời.</p></div>
<div class="grid-form"><label v-for="d in s.report?.sourceDimensions||[]" :key="d.name" class="field">{{d.name}}<MCombobox :model-value="Object.hasOwn(s.sources,d.name)?s.sources[d.name]:'__ALL__'" :options="[{value:'__ALL__',label:'Tất cả'},...d.values.map(v=>({value:v.value,label:v.label+' ('+number(v.count)+')'}))]" @update:model-value="sourceValue(d.name,$event)" /></label></div>
<div class="row justify-between"><span class="muted">Ngày Việt Nam · dd/mm/yyyy · UTC+7</span><MButton variant="secondary" @click="resetFilters">Xem toàn bộ mới nhất</MButton></div></div></section></template>
