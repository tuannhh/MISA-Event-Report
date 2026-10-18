<script setup>
import {ref} from 'vue';
import {s,modeOptions} from './store';
const expanded=ref(false);
const main=['name','phone','email','company','staff_code'];
const extra=Object.keys(s.user.fields).filter(k=>!main.includes(k)&&!['call_status','attendance_mode'].includes(k));
</script><template><div class="stack"><div class="grid-form"><label class="field">Hình thức tham dự<MSelect v-model="s.editRow.attendance_mode" :options="modeOptions.filter(o=>o.value!=='both')"/></label><label class="field">Tình trạng<MSelect v-model="s.editRow.registration_status" :options="[{value:'invited',label:'Đã mời — chưa đăng ký'},{value:'registered',label:'Đã đăng ký'}]"/></label></div><label v-for="key in main" :key="key" class="field">{{s.user.fields[key]}}<MInput v-model="s.editRow[key]" :type="key==='email'?'email':key==='phone'?'tel':'text'"/></label><MButton variant="link" :aria-expanded="expanded" @click="expanded=!expanded">{{expanded?'Thu gọn':'Thông tin bổ sung'}}</MButton><div v-if="expanded" class="grid-form"><label v-for="key in extra" :key="key" class="field">{{s.user.fields[key]}}<MInput v-model="s.editRow[key]" :placeholder="key==='submitted_at'?'dd/mm/yyyy hh:mm':''"/></label></div></div></template>
