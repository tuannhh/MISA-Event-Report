<script setup>
import {s,dateText} from './store';
</script><template><div class="card"><h2>{{s.event.name}}</h2><p class="muted">Thời gian submit: {{s.filters.from?dateText(s.filters.from):'Tất cả'}} → {{s.filters.to?dateText(s.filters.to):'Tất cả'}} · Hình thức: {{({all:'Tất cả',online:'Online',offline:'Offline',both:'Cả hai',unknown:'Chưa xác định'})[s.filters.mode]}}</p><p v-if="Object.keys(s.sources).length" class="muted">Nguồn: {{Object.entries(s.sources).map(([k,v])=>k+': '+(v||'Chưa xác định')).join(' · ')}}</p></div></template>
