<script setup>
import {s,sourceValue,resetFilters,number,dateText,modeOptions} from './store';
defineProps({open:Boolean,compact:Boolean});
</script>
<template><section v-if="open" id="report-filters" aria-label="Bộ lọc báo cáo" class="card stack" :class="{'compact-filter-panel':compact}">
<div class="grid-form"><label class="field">Từ ngày submit<MDatePicker v-model="s.filters.from" /></label><label class="field">Đến ngày submit<MDatePicker v-model="s.filters.to" /></label><label class="field">So sánh từ ngày<MDatePicker v-model="s.filters.compareFrom" /></label><label class="field">So sánh đến ngày<MDatePicker v-model="s.filters.compareTo" /></label>
<label class="field">Phiên dữ liệu<MCombobox v-model="s.filters.snapshot" :options="[{value:'',label:'Bản mới nhất'},...s.snapshots.map(v=>({value:v.id,label:dateText(v.created_at)+' · '+v.label}))]" /></label>
<label v-if="s.event?.mode==='hybrid'" class="field">Hình thức tham dự<MSelect v-model="s.filters.mode" :options="[{value:'all',label:'Tất cả hình thức'},...modeOptions.filter(o=>['online','offline'].includes(o.value))]" /></label></div>
<div><h3>Lọc theo nguồn, nhân viên</h3><p v-if="!compact" class="muted">Mặc định tổng hợp toàn bộ dữ liệu mới nhất. Chọn thời gian, nguồn hoặc nhân viên khi cần xem chi tiết. Tự cập nhật KPI, bảng và biểu đồ. Các điều kiện được kết hợp đồng thời.</p></div>
<div class="grid-form"><label v-for="d in s.report?.sourceDimensions||[]" :key="d.name" class="field">{{d.name}}<MCombobox :model-value="Object.hasOwn(s.sources,d.name)?s.sources[d.name]:'__ALL__'" :options="[{value:'__ALL__',label:'Tất cả'},...d.values.map(v=>({value:v.value,label:v.label+' ('+number(v.count)+')'}))]" @update:model-value="sourceValue(d.name,$event)" /></label></div>
<div v-if="!compact" class="row justify-between"><span class="muted">Ngày Việt Nam · dd/mm/yyyy · UTC+7</span><MButton variant="secondary" @click="resetFilters">Xem toàn bộ mới nhất</MButton></div></section></template>
