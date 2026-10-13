import { expect, test, type Page, type Locator } from '@playwright/test'

const STORAGE_KEY = 'kanban:v1'

async function resetAndVisit(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
  await expect(page.getByRole('heading', { name: '项目看板', level: 1, exact: true })).toBeVisible()
  await expect(columnByTitle(page, '待办')).toBeVisible()
  await expect(columnByTitle(page, '进行中')).toBeVisible()
  await expect(columnByTitle(page, '已完成')).toBeVisible()
}

function columnByTitle(page: Page, title: string): Locator {
  return page.locator('section').filter({ has: page.getByRole('button', { name: title, exact: true }) })
}

function cardByTitle(page: Page, title: string): Locator {
  return page.locator('[data-task-id]').filter({ has: page.getByRole('heading', { name: title }) })
}

async function openTopNewTaskDialog(page: Page) {
  await page.getByRole('button', { name: '新任务' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: '新建任务' })).toBeVisible()
}

/** 获取当前打开的筛选下拉面板（责任人或优先级） */
function filterDropdown(page: Page) {
  return page.locator('.absolute.left-0.top-full.z-30')
}

test.describe('项目看板 - E2E 验收', () => {
  test.beforeEach(async ({ page }) => {
    await resetAndVisit(page)
  })

  test('REQ-001/REQ-009: 首屏加载预置三列 + 示例任务（含逾期/今日到期/未分配）', async ({ page }) => {
    await expect(columnByTitle(page, '待办')).toBeVisible()
    await expect(columnByTitle(page, '进行中')).toBeVisible()
    await expect(columnByTitle(page, '已完成')).toBeVisible()
    await expect(page.locator('text=已逾期').first()).toBeVisible()
    await expect(cardByTitle(page, '补充 E2E 主流程用例')).toContainText('未分配')
    await expect(page.getByRole('button', { name: /^成员（/ })).toContainText('5')
  })

  test('REQ-003/REQ-005: 顶部「新任务」→ 填标题/责任人/优先级/截止日期→保存后卡片字段正确', async ({ page }) => {
    await openTopNewTaskDialog(page)
    await page.getByTestId('task-title-input').fill('E2E 验收新任务')
    const selects = page.getByRole('dialog').locator('select')
    await selects.nth(1).selectOption({ label: '张小明' })
    await page.getByRole('button', { name: /P0/ }).click()
    const today = new Date().toISOString().slice(0, 10)
    await page.getByRole('dialog').locator('input[type="date"]').fill(today)

    await page.getByTestId('task-save-btn').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const newCard = columnByTitle(page, '待办').locator('[data-task-id]').filter({ hasText: 'E2E 验收新任务' })
    await expect(newCard).toBeVisible()
    await expect(newCard).toContainText('P0')
    await expect(newCard).toContainText('张小明')
    const mmdd = today.slice(5)
    await expect(newCard).toContainText(mmdd)
  })

  test('REQ-003: 标题为空时保存按钮置灰', async ({ page }) => {
    await openTopNewTaskDialog(page)
    await expect(page.getByTestId('task-save-btn')).toBeDisabled()
    await page.keyboard.press('Escape')
  })

  test('REQ-004: 卡片拖拽跨列移动，刷新后仍保留', async ({ page }) => {
    const card = cardByTitle(page, '补充 E2E 主流程用例')
    const todoCol = columnByTitle(page, '待办')
    const doingCol = columnByTitle(page, '进行中')

    const cardBox = await card.boundingBox()
    const doingBox = await doingCol.boundingBox()
    expect(cardBox).not.toBeNull()
    expect(doingBox).not.toBeNull()
    if (!cardBox || !doingBox) throw new Error('bounding box null')

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2 + 20, { steps: 5 })
    await page.waitForTimeout(200)
    await page.mouse.move(doingBox.x + doingBox.width / 2, doingBox.y + 100, { steps: 15 })
    await page.waitForTimeout(250)
    await page.mouse.up()
    await page.waitForTimeout(400)

    await expect(todoCol.locator('[data-task-id]').filter({ hasText: '补充 E2E 主流程用例' })).toHaveCount(0)
    await expect(doingCol.locator('[data-task-id]').filter({ hasText: '补充 E2E 主流程用例' })).toHaveCount(1)

    await page.reload()
    await expect(columnByTitle(page, '进行中').locator('[data-task-id]').filter({ hasText: '补充 E2E 主流程用例' })).toHaveCount(1)
  })

  test('REQ-007/REQ-002: 责任人颜色条/头像一致；未分配灰色；筛选首项为责任人', async ({ page }) => {
    // 筛选工具条首项为「责任人」：通过 getByRole 直接定位，确认其在搜索框左侧
    const assigneeFilter = page.getByRole('button', { name: /^责任人/ })
    await expect(assigneeFilter).toBeVisible()
    const searchBox = page.getByTestId('search-input')
    const afBox = await assigneeFilter.boundingBox()
    const sbBox = await searchBox.boundingBox()
    expect(afBox && sbBox).toBeTruthy()
    if (afBox && sbBox) expect(afBox.x).toBeLessThan(sbBox.x)

    // 已分配卡片「梳理项目看板需求」（张小明，chili 色）
    const assigned = cardByTitle(page, '梳理项目看板需求')
    await expect(assigned.locator('span.w-\\[3px\\]')).toHaveClass(/bg-chili-500/)
    // 头像：span[aria-label="张小明"] 的底色
    await expect(assigned.locator('span[aria-label="张小明"]')).toHaveClass(/bg-chili-500/)

    // 未分配卡片：颜色条灰色、存在 aria-label="未分配" 的灰色占位
    const unassigned = cardByTitle(page, '补充 E2E 主流程用例')
    await expect(unassigned.locator('span.w-\\[3px\\]')).toHaveClass(/bg-stone-400/)
    await expect(unassigned.locator('span[aria-label="未分配"]')).toBeVisible()
    await expect(unassigned).toContainText('未分配')
  })

  test('REQ-008: 关键字搜索过滤 + 重置恢复全量', async ({ page }) => {
    const search = page.getByTestId('search-input')
    await search.fill('E2E')
    await page.waitForTimeout(400)
    await expect(cardByTitle(page, '补充 E2E 主流程用例')).toBeVisible()
    await expect(cardByTitle(page, '梳理项目看板需求')).toHaveCount(0)
    await expect(page.getByText('该筛选条件下暂无任务').first()).toBeVisible()

    // 筛选条内的「重置」按钮（exact，避免匹配「重置为初始示例」）
    await page.getByRole('button', { name: '重置', exact: true }).click()
    await expect(search).toHaveValue('')
    await expect(cardByTitle(page, '梳理项目看板需求')).toBeVisible()
    await expect(cardByTitle(page, '补充 E2E 主流程用例')).toBeVisible()
  })

  test('REQ-008: 责任人筛选 + 优先级 AND 组合', async ({ page }) => {
    await page.getByRole('button', { name: /责任人/ }).click()
    const panel = filterDropdown(page)
    await panel.getByRole('button', { name: "张小明" }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    await expect(cardByTitle(page, '梳理项目看板需求')).toBeVisible()
    await expect(cardByTitle(page, '设计评审走查')).toBeVisible()
    await expect(cardByTitle(page, '实现拖拽排序列与卡片')).toHaveCount(0)

    await page.getByRole('button', { name: /优先级/ }).click()
    const prioPanel = filterDropdown(page)
    await prioPanel.getByRole('button', { name: /P0/ }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
    await expect(cardByTitle(page, '梳理项目看板需求')).toBeVisible()
    await expect(cardByTitle(page, '设计评审走查')).toHaveCount(0)
  })

  test('REQ-005: 逾期红色/今日琥珀/未来炭灰', async ({ page }) => {
    const overdue = cardByTitle(page, '梳理项目看板需求')
    await expect(overdue.locator('text=已逾期')).toBeVisible()

    const today = cardByTitle(page, '实现拖拽排序列与卡片')
    await expect(today.locator('.bg-amber-100').first()).toBeVisible()

    const future = cardByTitle(page, '筛选与搜索工具条')
    await expect(future.locator('span.text-charcoal-500').first()).toBeVisible()
  })

  test('REQ-001: 非空列删除按钮禁用；空列确认删除后消失', async ({ page }) => {
    page.once('dialog', async (d) => {
      await d.accept('待验收')
    })
    await page.getByRole('button', { name: '新增列' }).click()
    await expect(columnByTitle(page, '待验收')).toBeVisible()

    const todoMenu = columnByTitle(page, '待办').getByRole('button', { name: '列操作' })
    await todoMenu.click()
    await expect(page.getByRole('button', { name: /列内有任务/ })).toBeDisabled()
    await page.keyboard.press('Escape')

    const emptyCol = columnByTitle(page, '待验收')
    await emptyCol.getByRole('button', { name: '列操作' }).click()
    await page.getByRole('button', { name: '删除列' }).click()
    await expect(page.getByRole('dialog').getByText('确定删除列「待验收」吗？')).toBeVisible()
    await page.getByRole('button', { name: '删除' }).click()
    await expect(columnByTitle(page, '待验收')).toHaveCount(0)
  })

  test('REQ-006: 新增成员→分配给任务→删除有任务成员后卡片变未分配', async ({ page }) => {
    await page.getByRole('button', { name: /成员（/ }).click()
    const memDialog = page.getByRole('dialog')
    await expect(memDialog.getByText('成员管理')).toBeVisible()
    await memDialog.getByPlaceholder('输入成员姓名，1–20 字').fill('测试成员')
    await memDialog.getByRole('button', { name: '添加' }).click()
    await expect(memDialog.getByText('测试成员')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    const card = cardByTitle(page, '补充 E2E 主流程用例')
    await card.click()
    await expect(page.getByRole('heading', { name: '编辑任务' })).toBeVisible()
    const editDialog = page.getByRole('dialog')
    await editDialog.locator('select').nth(1).selectOption({ label: '测试成员' })
    await page.getByTestId('task-save-btn').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(card).toContainText('测试成员')
    await expect(card.locator('span.w-\\[3px\\]')).not.toHaveClass(/bg-stone-400/)

    await page.getByRole('button', { name: /成员（/ }).click()
    const dlg = page.getByRole('dialog')
    const memberRow = dlg.locator('div.rounded-xl.bg-white.p-3').filter({ hasText: '测试成员' })
    await expect(memberRow).toHaveCount(1)
    await memberRow.getByRole('button', { name: '删除成员' }).click()
    await expect(page.getByText(/该成员当前有 \d+ 个任务/)).toBeVisible()
    await page.getByRole('button', { name: '删除' }).click()
    await page.waitForTimeout(200)
    await page.keyboard.press('Escape')

    await expect(card).toContainText('未分配')
    await expect(card.locator('span.w-\\[3px\\]')).toHaveClass(/bg-stone-400/)
  })

  test('主流程闭环: 新建任务→分配责任人→拖拽到进行中→按责任人筛选可见', async ({ page }) => {
    await openTopNewTaskDialog(page)
    await page.getByTestId('task-title-input').fill('闭环验收任务')
    const dialog = page.getByRole('dialog')
    await dialog.locator('select').nth(1).selectOption({ label: '李华' })
    await page.getByTestId('task-save-btn').click()
    await expect(dialog).not.toBeVisible()

    const card = cardByTitle(page, '闭环验收任务')
    await expect(card).toBeVisible()
    await expect(card).toContainText('李华')

    const cardBox = await card.boundingBox()
    const doingBox = await columnByTitle(page, '进行中').boundingBox()
    expect(cardBox && doingBox).toBeTruthy()
    if (!cardBox || !doingBox) throw new Error('box null')
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + 30, { steps: 5 })
    await page.waitForTimeout(200)
    await page.mouse.move(doingBox.x + doingBox.width / 2, doingBox.y + 120, { steps: 15 })
    await page.waitForTimeout(250)
    await page.mouse.up()
    await page.waitForTimeout(400)

    await expect(columnByTitle(page, '进行中').locator('[data-task-id]').filter({ hasText: '闭环验收任务' })).toHaveCount(1)

    await page.getByRole('button', { name: /责任人/ }).click()
    const panel = filterDropdown(page)
    await panel.getByRole('button', { name: "李华" }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await expect(cardByTitle(page, '闭环验收任务')).toBeVisible()
    await expect(cardByTitle(page, '梳理项目看板需求')).toHaveCount(0)
  })
})
