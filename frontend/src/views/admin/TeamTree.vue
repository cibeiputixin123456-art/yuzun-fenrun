<template>
  <div class="tree-page">
    <div class="page-title">🌳 团队架构树</div>

    <!-- 搜索会员 -->
    <div class="card search-card">
      <div class="search-row">
        <el-input
          v-model="keyword"
          placeholder="输入姓名或手机号搜索会员"
          size="large"
          clearable
          @keyup.enter="searchMember"
          style="flex:1"
        />
        <el-button type="primary" size="large" @click="searchMember" :loading="searching">搜索</el-button>
      </div>

      <!-- 搜索结果 -->
      <div v-if="searchResults.length" class="search-results">
        <div
          v-for="m in searchResults" :key="m.id"
          class="search-item"
          @click="loadTree(m)"
        >
          <span class="si-name">{{ m.name }}</span>
          <span class="si-phone">{{ m.phone }}</span>
          <el-tag size="small" :type="levelTagType(m.level)">{{ levelLabel(m.level) }}</el-tag>
          <span class="si-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 团队树 -->
    <div class="card" v-if="treeRoot">
      <div class="tree-header">
        <span class="tree-title">{{ treeRoot.name }} 的团队</span>
        <span class="tree-total">共 {{ totalCount }} 人</span>
      </div>

      <!-- 根节点 -->
      <div class="tree-node root-node">
        <div class="node-bar">
          <div class="node-avatar gold">{{ treeRoot.name?.slice(0,1) }}</div>
          <div class="node-info">
            <div class="node-name">{{ treeRoot.name }} <span class="node-id">#{{ treeRoot.id }}</span></div>
            <div class="node-meta">
              <el-tag size="small" :type="levelTagType(treeRoot.level)">{{ levelLabel(treeRoot.level) }}</el-tag>
              <span class="node-rank">{{ rankLabel(treeRoot.rank) }}</span>
            </div>
          </div>
          <div class="node-sales">
            <div class="ns-num">¥{{ fmt(treeRoot.total_service_sales) }}</div>
            <div class="ns-label">团队业绩</div>
          </div>
        </div>
      </div>

      <!-- 递归子树 -->
      <div class="children-wrap" v-if="treeRoot.children?.length">
        <TreeNode
          v-for="child in treeRoot.children"
          :key="child.id"
          :node="child"
          :depth="1"
        />
      </div>
      <div class="empty-text" v-else>该会员暂无下级</div>
    </div>

    <!-- 未搜索状态 -->
    <div class="card empty-card" v-if="!treeRoot && !searching">
      <div class="empty-hint">🔍 搜索会员后查看其完整团队架构</div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineComponent, h } from 'vue'
import { ElTag, ElIcon } from 'element-plus'
import { api } from '../../api'

const keyword = ref('')
const searching = ref(false)
const searchResults = ref([])
const treeRoot = ref(null)
const totalCount = ref(0)

const LEVEL_LABELS = { xinxiang: '星享体验官', xingyao: '星耀服务官', huiyuan: '普通会员' }
const RANK_LABELS = {
  xingyao: '星耀分享官', senior: '高级服务顾问', expert: '资深服务顾问',
  city: '城市运营负责人', region: '大区运营负责人', strategy: '战略共建合伙人', shareholder: '公司股东董事',
}
function levelLabel(l) { return LEVEL_LABELS[l] || l }
function rankLabel(r) { return RANK_LABELS[r] || '' }
function levelTagType(l) {
  if (l === 'xingyao') return 'warning'
  if (l === 'xinxiang') return 'success'
  return 'info'
}
function fmt(n) { return (n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) }

function countNodes(node) {
  let count = 1
  if (node.children) node.children.forEach(c => { count += countNodes(c) })
  return count
}

async function searchMember() {
  if (!keyword.value.trim()) return
  searching.value = true
  searchResults.value = []
  try {
    const res = await api.get('/members', { params: { keyword: keyword.value, pageSize: 10 } })
    searchResults.value = res.data.data || []
  } finally {
    searching.value = false
  }
}

async function loadTree(member) {
  searchResults.value = []
  keyword.value = member.name
  try {
    const res = await api.get(`/members/${member.id}/tree`)
    treeRoot.value = { ...member, children: res.data.children }
    totalCount.value = countNodes(treeRoot.value) - 1 // 不算自己
  } catch {
    treeRoot.value = { ...member, children: [] }
    totalCount.value = 0
  }
}

// 递归树节点组件
const TreeNode = defineComponent({
  name: 'TreeNode',
  props: { node: Object, depth: Number },
  setup(props) {
    const expanded = ref(true)
    const toggle = () => { expanded.value = !expanded.value }

    return () => {
      const n = props.node
      const hasChildren = n.children && n.children.length > 0
      const indent = props.depth * 20

      return h('div', { class: 'tree-node', style: { marginLeft: indent + 'px' } }, [
        h('div', { class: 'node-bar' }, [
          hasChildren
            ? h('span', { class: 'toggle-btn', onClick: toggle }, expanded.value ? '▼' : '▶')
            : h('span', { class: 'toggle-placeholder' }, '·'),
          h('div', { class: ['node-avatar', n.level === 'xingyao' ? 'gold' : 'silver'] }, n.name?.slice(0,1)),
          h('div', { class: 'node-info' }, [
            h('div', { class: 'node-name' }, [
              n.name,
              h('span', { class: 'node-id' }, ` #${n.id}`)
            ]),
            h('div', { class: 'node-meta' }, [
              h(ElTag, { size: 'small', type: n.level === 'xingyao' ? 'warning' : n.level === 'xinxiang' ? 'success' : 'info' },
                () => LEVEL_LABELS[n.level] || n.level),
              hasChildren ? h('span', { class: 'child-count' }, `${n.children.length}个直属`) : null,
            ])
          ]),
          h('div', { class: 'node-sales' }, [
            h('div', { class: 'ns-num' }, `¥${(n.total_personal_sales || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`),
            h('div', { class: 'ns-label' }, '个人销售'),
          ])
        ]),
        expanded.value && hasChildren
          ? h('div', { class: 'children-wrap' },
              n.children.map(child =>
                h(TreeNode, { key: child.id, node: child, depth: props.depth + 1 })
              )
            )
          : null
      ])
    }
  }
})
</script>

<style scoped>
.tree-page { padding-bottom: 40px; }
.page-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 14px; }

.card {
  background: #A07820;
  border: 1.5px solid rgba(255,255,255,0.25);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  color: #fff;
}
.search-card { background: rgba(255,255,255,0.15); }
.empty-card { background: rgba(255,255,255,0.08); text-align: center; padding: 32px; }
.empty-hint { color: rgba(255,255,255,0.5); font-size: 14px; }

.search-row { display: flex; gap: 10px; }
.search-results { margin-top: 12px; }
.search-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,0.1); margin-bottom: 6px;
  transition: background 0.2s;
}
.search-item:hover { background: rgba(255,255,255,0.2); }
.si-name { font-weight: 600; font-size: 14px; }
.si-phone { font-size: 12px; color: rgba(255,255,255,0.6); flex: 1; }
.si-arrow { color: rgba(255,255,255,0.5); }

.tree-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tree-title { font-size: 16px; font-weight: 700; }
.tree-total { font-size: 12px; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 12px; }

.tree-node { margin-bottom: 6px; }
.root-node { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2); }

.node-bar { display: flex; align-items: center; gap: 10px; }
.toggle-btn { width: 16px; font-size: 10px; cursor: pointer; color: rgba(255,255,255,0.7); flex-shrink: 0; }
.toggle-placeholder { width: 16px; font-size: 10px; color: rgba(255,255,255,0.3); flex-shrink: 0; }

.node-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.node-avatar.gold { background: linear-gradient(135deg, #C9A84C, #8B6914); }
.node-avatar.silver { background: linear-gradient(135deg, #aaa, #777); }

.node-info { flex: 1; }
.node-name { font-size: 14px; font-weight: 600; }
.node-id { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 400; }
.node-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.node-rank { font-size: 11px; color: rgba(255,255,255,0.6); }
.child-count { font-size: 11px; color: rgba(255,255,255,0.6); }

.node-sales { text-align: right; flex-shrink: 0; }
.ns-num { font-size: 13px; font-weight: 600; }
.ns-label { font-size: 10px; color: rgba(255,255,255,0.5); }

.children-wrap { border-left: 1px dashed rgba(255,255,255,0.2); margin-left: 18px; padding-left: 0; }
.empty-text { text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; padding: 16px; }
</style>
