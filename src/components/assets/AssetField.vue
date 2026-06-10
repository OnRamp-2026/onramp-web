<script setup lang="ts">
import { ref, nextTick, watch } from "vue";

const props = defineProps<{
  num: string;
  label: string;
  hint: string;
  value: string;
  edited?: boolean;
  locked?: boolean;
}>();
const emit = defineEmits<{ update: [value: string] }>();

const editing = ref(false);
const draft = ref(props.value);
const ta = ref<HTMLTextAreaElement | null>(null);

watch(
  () => props.value,
  (v) => {
    if (!editing.value) draft.value = v;
  },
);

async function open() {
  if (props.locked) return;
  draft.value = props.value;
  editing.value = true;
  await nextTick();
  ta.value?.focus();
  autoGrow();
}
function commit() {
  editing.value = false;
  if (draft.value !== props.value) emit("update", draft.value);
}
function cancel() {
  editing.value = false;
  draft.value = props.value;
}
function autoGrow() {
  const el = ta.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
</script>

<template>
  <div class="grid grid-cols-[132px_1fr] group" :class="num !== '01' ? 'border-t border-line' : ''">
    <!-- 라벨 -->
    <div class="px-4 py-[15px] bg-[#f3f7fb] border-r border-line flex flex-col gap-1">
      <div class="font-mono text-[11px] text-slate flex items-center gap-1.5">
        <span class="text-teal font-semibold">{{ num }}</span> {{ label }}
      </div>
      <div class="text-[10.5px] text-faint leading-snug">{{ hint }}</div>
      <span
        v-if="edited"
        class="mt-0.5 self-start font-mono text-[9.5px] px-1.5 py-px rounded-full bg-blue/10 text-[#1668b3]"
        >수정됨</span
      >
    </div>

    <!-- 본문 / 편집 -->
    <div class="relative">
      <!-- 편집 모드 -->
      <div v-if="editing" class="px-[18px] py-3.5">
        <textarea
          ref="ta"
          v-model="draft"
          rows="2"
          class="w-full resize-none bg-surf2 border border-blue/40 rounded-lg px-3 py-2.5 text-[14px] leading-[1.6] outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
          @input="autoGrow"
          @keydown.meta.enter.prevent="commit"
          @keydown.esc="cancel"
        ></textarea>
        <div class="flex items-center gap-2 mt-2">
          <button
            class="font-medium text-[12px] px-3 py-1.5 rounded-lg bg-navy text-white hover:bg-navy/90 transition"
            @click="commit"
          >
            저장
          </button>
          <button class="text-[12px] px-2.5 py-1.5 rounded-lg text-slate hover:bg-navy/5" @click="cancel">취소</button>
          <span class="ml-auto font-mono text-[10px] text-faint">⌘↵ 저장 · esc 취소</span>
        </div>
      </div>

      <!-- 읽기 모드 -->
      <button
        v-else
        type="button"
        class="w-full text-left px-[18px] py-[15px] transition"
        :class="locked ? 'cursor-default' : 'cursor-text hover:bg-[#f7fbff]'"
        @click="open"
      >
        <p v-if="value.trim()" class="text-[14.5px] leading-[1.62] whitespace-pre-wrap text-ink">{{ value }}</p>
        <p v-else class="text-[13.5px] text-faint italic">
          비어 있음 — {{ locked ? "내용 없음" : "클릭해 작성하세요" }}
        </p>
        <span
          v-if="!locked"
          class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition font-mono text-[10px] text-faint flex items-center gap-1"
        >
          ✎ 수정
        </span>
      </button>
    </div>
  </div>
</template>
