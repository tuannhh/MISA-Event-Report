<script setup>
import {computed,ref} from 'vue';
import {s,run,loadRows,resetRowFilters,number} from './store';
import RegistrationFilterFields from './RegistrationFilterFields.vue';
defineProps({fieldsOnly:Boolean});
const open=ref(false);
const count=computed(()=>Object.values(s.rowFilters).filter(v=>v?.length).length+Number(!!s.rowFrom)+Number(!!s.rowTo));
</script><template><RegistrationFilterFields v-if="fieldsOnly"/><section v-else class="registration-search stack" aria-label="Tìm và lọc đăng ký"><div class="row registration-search-bar"><MInput v-model="s.query" placeholder="Tìm tên, email, điện thoại, công ty, tracking" aria-label="Tìm đăng ký" @keyup.enter="s.page=1;run(loadRows)"/><MButton variant="secondary" @click="s.page=1;run(loadRows)">Tìm kiếm</MButton><MButton variant="secondary" :aria-expanded="open" @click="open=true"><template #icon><MIcon name="filter" :size="20"/></template>Bộ lọc<span v-if="count"> ({{count}})</span></MButton><MButton v-if="count||s.query" variant="link" @click="resetRowFilters">Xóa lọc</MButton></div><span class="muted">{{number(s.rowTotal)}} khách<span v-if="count"> · {{count}} bộ lọc</span></span><MDialog v-model="open" title="Bộ lọc đăng ký" :width="860"><RegistrationFilterFields/><template #footer><MButton variant="secondary" @click="resetRowFilters">Xóa bộ lọc</MButton><MButton variant="primary" @click="open=false">Xem kết quả</MButton></template></MDialog></section></template>
