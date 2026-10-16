<script setup>
// Separate mobile list composition; no desktop platform header or sidebar.
import {s,filteredEvents,run,openEvent,showEventList,isSuper,roleNames,dateText,number} from './store';
import {canEditEvent} from './navigation';
import MMobileTopBar from './mobile/MMobileTopBar.vue';
const modes={online:'Online',offline:'Offline',hybrid:'Online và offline'};
</script>

<template>
  <div class="mds-mobile-app relative flex h-full flex-col overflow-hidden">
    <MMobileTopBar title="Danh sách sự kiện" :show-back="false" show-more @more="s.dialog='account'">
      <template #actions><MButton v-if="isSuper" variant="primary" @click="s.dialog='new-event'">Tạo mới</MButton></template>
    </MMobileTopBar>
    <main class="scroll-region page-body stack">
      <div v-if="s.error" role="alert" class="error">{{s.error}}</div>
      <div v-if="s.message" role="status" class="notice">{{s.message}}</div>
      <progress v-if="s.busy" aria-label="Đang tải sự kiện" />
      <p>Chọn sự kiện để tiếp tục. Quyền chỉnh sửa được cấp riêng cho từng sự kiện.</p>
      <label class="field">Tìm sự kiện<MInput v-model="s.eventSearch" placeholder="Nhập tên sự kiện" clearable /></label>
      <MTabs v-model="s.eventAccess" variant="pill" :tabs="[{key:'all',label:'Tất cả'},{key:'edit',label:'Được sửa'},{key:'view',label:'Chỉ xem'}]" />
      <div class="toolbar"><span class="muted">{{number(filteredEvents.length)}} sự kiện</span><MButton variant="secondary" :loading="s.busy" @click="run(()=>showEventList(false))">Làm mới</MButton></div>
      <section class="card mobile-list" aria-label="Các sự kiện">
        <article v-for="event in filteredEvents" :key="event.id" class="stack" :aria-label="event.name">
          <div class="row justify-between"><MTag :color="canEditEvent(event)?'brand':'neutral'">{{roleNames[event.role]}}</MTag><span class="muted">{{modes[event.mode]}}</span></div>
          <h2 class="!mb-0">{{event.name}}</h2>
          <p class="muted">Ngày tổ chức: {{dateText(event.event_date)}}</p>
          <p>{{canEditEvent(event)?'Được chỉnh sửa trong sự kiện này.':'Chỉ xem báo cáo và dữ liệu.'}}</p>
          <MButton variant="secondary" :disabled="s.busy" @click="run(()=>openEvent(event.id))">{{canEditEvent(event)?'Mở sự kiện':'Xem sự kiện'}}</MButton>
        </article>
        <MEmptyState v-if="!filteredEvents.length&&!s.busy" :type="s.events.length?'no-result':'initial'" :title="s.events.length?'Không có sự kiện phù hợp':'Chưa có sự kiện'" />
      </section>
    </main>
  </div>
</template>
