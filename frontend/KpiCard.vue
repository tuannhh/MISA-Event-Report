<script setup>
import {s,number,percent} from './store';defineProps({kind:String});
const labels={total:'Tổng lượt đăng ký',completion:'Hoàn thành mục tiêu',clevel:'Đăng ký C-Level',ratio:'Tỷ lệ C-Level',call_rate:'Tỷ lệ gọi xác nhận',online:'Online',offline:'Offline'};
const mode=(data,kind)=>data.attendance?.find(r=>r.value===kind);
const value=(data,kind)=>kind==='ratio'?percent(data.clevel_completion):kind==='completion'?percent(data.completion):kind==='call_rate'?percent(data.call_rate):number(['online','offline'].includes(kind)?mode(data,kind)?.count:data[kind]);
function detail(data,kind){
 if(kind==='call_rate')return `${number(data.called)} / ${number(data.total)} khách đã được gọi`;
 if(['online','offline'].includes(kind))return `${percent(mode(data,kind)?.percent)} tổng đăng ký`;
 return kind==='ratio'?number(data.clevel)+' / '+number(data.target)+' C-Level / mục tiêu':kind==='completion'?number(data.total)+' / '+number(data.target)+' lượt đăng ký':kind==='clevel'?'Theo chức vụ đã cấu hình':'Theo thời gian submit & bộ lọc';
}
</script><template><article class="card" :class="'kpi-'+kind"><p class="muted">{{labels[kind]}}</p><div class="kpi-value">{{value(s.report.current,kind)}}</div><p class="muted kpi-detail">{{detail(s.report.current,kind)}}</p><p v-if="kind==='call_rate'&&s.report.current.call_unknown" class="muted">{{number(s.report.current.call_unknown)}} khách chưa xác định trạng thái gọi.</p><p v-if="s.report.comparison" class="muted">Kỳ so sánh: {{value(s.report.comparison,kind)}}</p></article></template>
