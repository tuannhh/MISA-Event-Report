<script setup>
import PagedRecords from './PagedRecords.vue';
import BrandLogo from './BrandLogo.vue';
// Event chooser: desktop composition adapted from the MDS ListPage template.
import {s,filteredEvents,run,openEvent,showEventList,isSuper,canCreateEvent,openAdminSettings,roleNames,dateText,number} from './store';
import {canEditEvent} from './navigation';
import {currentHeaderMode} from './mds/theme-state';
const modes={online:'Online',offline:'Offline',hybrid:'Online và offline'};
const accessOptions=[{value:'all',label:'Tất cả sự kiện'},{value:'edit',label:'Được chỉnh sửa'},{value:'view',label:'Chỉ xem'}];
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <MHeaderBar class="shrink-0" app-name="Event Report" :variant="currentHeaderMode" :user="s.user"
      :show-assistant="false" :show-chat="false" :show-notifications="false" :show-help="false" :show-more="false" :show-whats-new="false"
      @settings="s.appearance=true" @user-click="s.dialog='account'"
      @app-switcher="run(()=>showEventList(false))" @logo-click="run(()=>showEventList(false))"><template #logo><BrandLogo/></template><template #search><div class="event-header-picker" :class="{brand:currentHeaderMode==='brand'}"><MCombobox :options="s.events.map(e=>({value:e.id,label:e.name}))" placeholder="Chọn sự kiện" aria-label="Chọn sự kiện" @update:model-value="run(()=>openEvent($event))"/></div></template></MHeaderBar>
    <div class="toolbar shrink-0 px-6 py-4">
      <div><h1>Danh sách sự kiện</h1><p class="muted">Chọn sự kiện để xem báo cáo hoặc chỉnh sửa theo quyền được cấp.</p></div>
      <div class="row"><MButton v-if="isSuper" variant="secondary" @click="openAdminSettings">Thiết lập thành viên</MButton><MButton v-if="canCreateEvent" variant="primary" @click="s.dialog='new-event'">Tạo sự kiện</MButton></div>
    </div>
    <main class="scroll-region px-6 pb-6 stack">
      <div v-if="s.error" role="alert" class="error">{{s.error}}</div>
      <div v-if="s.message" role="status" class="notice">{{s.message}}</div>
      <progress v-if="s.busy" aria-label="Đang tải sự kiện" />
      <section class="card toolbar" aria-label="Tìm và lọc sự kiện">
        <label class="field w-80 max-w-full">Tìm sự kiện<MInput v-model="s.eventSearch" placeholder="Nhập tên sự kiện" clearable /></label>
        <MRadioGroup v-model="s.eventAccess" :options="accessOptions" />
        <MButton variant="secondary" :loading="s.busy" @click="run(()=>showEventList(false))">Làm mới</MButton>
      </section>
      <p class="muted">{{number(filteredEvents.length)}} sự kiện · Quyền được cấp riêng cho từng sự kiện. Chưa được cấp quyền chỉnh sửa thì là Viewer.</p>
<PagedRecords :rows="filteredEvents" v-slot="{rows:pageRows}">      <div class="grid gap-4" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">
        <article v-for="event in pageRows" :key="event.id" class="card flex flex-col gap-4" :aria-label="event.name">
          <div class="row justify-between"><MTag :color="canEditEvent(event)?'brand':'neutral'">{{roleNames[event.role]}}</MTag><span class="muted">{{modes[event.mode]}}</span></div>
          <h2 class="!mb-0 break-words">{{event.name}}</h2>
          <p class="muted row"><MIcon name="calendar" :size="16" />{{dateText(event.event_date)}}</p>
          <p>{{canEditEvent(event)?'Bạn có quyền chỉnh sửa trong sự kiện này.':'Bạn chỉ có quyền xem Tổng quan của sự kiện.'}}</p>
          <div class="mt-auto row justify-end"><MButton variant="secondary" :disabled="s.busy" @click="run(()=>openEvent(event.id))">{{canEditEvent(event)?'Mở sự kiện':'Xem sự kiện'}}</MButton></div>
        </article>
      </div>
      <MEmptyState v-if="!filteredEvents.length&&!s.busy" :type="s.events.length?'no-result':'initial'"
        :title="s.events.length?'Không có sự kiện phù hợp':'Chưa có sự kiện'" />
</PagedRecords>
    </main>
  </div>
</template>
