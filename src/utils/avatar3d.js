import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

// GLB 女性人体原型（public/female_body_prototype.glb）
// 参数化：身高 → 整体 y 缩放；体重/腰围 → 横向厚度比例
const MODEL_URL = '/female_body_prototype.glb'

export function createAvatarScene(container) {
  const width = Math.max(container.clientWidth, 200)
  const height = Math.max(container.clientHeight, 300)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 2000)
  camera.position.set(0, 105, 330)

  // 灯光
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9db4e0, 1.05))
  const key = new THREE.DirectionalLight(0xffffff, 1.7)
  key.position.set(160, 340, 260)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -120
  key.shadow.camera.right = 120
  key.shadow.camera.top = 220
  key.shadow.camera.bottom = -20
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xbcd0ff, 0.5)
  fill.position.set(-240, 160, -180)
  scene.add(fill)

  // 地面 + 网格
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(95, 48),
    new THREE.MeshStandardMaterial({ color: 0xf3f6fd, roughness: 0.9 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  const grid = new THREE.GridHelper(190, 19, 0xc9d6ee, 0xe4ebf8)
  grid.position.y = 0.05
  scene.add(grid)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 80, 0)
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.4
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 120
  controls.maxDistance = 700
  controls.maxPolarAngle = Math.PI / 2 - 0.05

  /* ---------- GLB 原型加载 ---------- */
  let raw = null // 原始模型（隐藏，作为克隆模板）
  let rawMetrics = null
  let pendingParams = null
  let current = null

  const loader = new GLTFLoader()
  loader.load(
    MODEL_URL,
    (gltf) => {
      raw = gltf.scene
      scene.add(raw)
      // 原型是平躺的（身体沿 Z 轴延伸，Y 轴是厚度）→ 旋转 -90° 站立
      raw.rotation.x = -Math.PI / 2
      raw.visible = false // 模板隐藏，不直接上屏
      raw.updateMatrixWorld(true)

      // 以“站立姿态”测盒：高度 = 旋转后的 Y 范围
      const box = new THREE.Box3().setFromObject(raw)
      const center = new THREE.Vector3()
      box.getCenter(center)
      rawMetrics = { height: box.max.y - box.min.y, box, center }
      let parts = 0
      raw.traverse((o) => { if (o.isMesh) parts++ })
      console.log(
        '[avatar3d] 原型部位', parts, '| 站立高度', rawMetrics.height.toFixed(2),
        '| 中心 y', center.y.toFixed(2), '| 宽深', (box.max.x - box.min.x).toFixed(2), (box.max.z - box.min.z).toFixed(2)
      )
      if (pendingParams) {
        const p = pendingParams
        pendingParams = null
        applyParams(p)
      }
    },
    undefined,
    (err) => console.error('[avatar3d] GLB 加载失败:', err)
  )

  /* ---------- 参数化：克隆原型并变形 ---------- */
  function applyParams({ heightCm, weightKg, bust, waist, hips }) {
    if (!raw || !rawMetrics) {
      pendingParams = { heightCm, weightKg, bust, waist, hips }
      return
    }
    // 移除旧克隆
    if (current) {
      scene.remove(current)
      current = null
    }

    const stdW = Math.max(40, heightCm - 105) // 标准体重（cm - 105）
    const fs = Math.sqrt(
      THREE.MathUtils.clamp(weightKg ? weightKg / stdW : 1, 0.55, 2.2)
    )
    // 横向厚度：体重比例为主，腰围输入作微调（68 为参考中值）
    const thickness = THREE.MathUtils.clamp(
      fs * (0.72 + 0.28 * (waist ? waist / 68 : 1)),
      0.62,
      1.9
    )
    const scale = heightCm / rawMetrics.height

    const clone = SkeletonUtils.clone(raw)
    clone.visible = true
    clone.scale.set(scale * thickness, scale, scale * thickness)
    clone.position.set(
      -rawMetrics.center.x * scale * thickness,
      -rawMetrics.box.min.y * scale,
      -rawMetrics.center.z * scale * thickness
    )
    // 材质整理：皮肤部位覆盖肤色，内面改双面渲染，衣物保持原型颜色
    const skinRe = /skin|head|neck|upper_arm|forearm|hand|foot|calt|calf|thigh|knee|torso/i
    const clothingRe = /leggings|bra/i
    clone.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      const isSkin = skinRe.test(o.name) && !clothingRe.test(o.name)
      const apply = (m) => {
        if (!m) return
        m.side = THREE.DoubleSide
        if (isSkin && m.color) {
          m.color = new THREE.Color(0xf2c9b0)
          m.roughness = 0.6
          m.metalness = 0
        }
      }
      Array.isArray(o.material) ? o.material.forEach(apply) : apply(o.material)
    })
    scene.add(clone)
    current = clone

    // 相机自动适配：目标/位置随最终身高走，任何素材单位都稳
    const h = heightCm
    controls.target.set(0, h * 0.52, 0)
    camera.position.set(0, h * 0.78, h * 2.7)
    camera.near = h / 100
    camera.far = h * 20
    camera.updateProjectionMatrix()
    controls.minDistance = h * 0.6
    controls.maxDistance = h * 4.6
  }

  /* ---------- 渲染循环 + 自适应 ---------- */
  let rafId
  const loop = () => {
    rafId = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  loop()

  const ro = new ResizeObserver(() => {
    const w = Math.max(container.clientWidth, 120)
    const h = Math.max(container.clientHeight, 240)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  ro.observe(container)

  function dispose() {
    cancelAnimationFrame(rafId)
    ro.disconnect()
    if (current) scene.remove(current)
    if (raw) scene.remove(raw)
    controls.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  // 调试钩子（暴露内部引用供诊断）
  window.__WB_AVATAR_DEBUG__ = {
    THREE,
    scene,
    camera,
    controls,
    getRaw: () => raw,
    getCurrent: () => current,
    state: () => ({
      camera: camera.position.toArray().map((n) => Number(n.toFixed(1))),
      near: camera.near,
      far: camera.far,
      target: controls.target.toArray().map((n) => Number(n.toFixed(1))),
      rawHeight: rawMetrics?.height?.toFixed(4) ?? null,
      rawLoaded: !!raw,
      current: current
        ? {
            pos: current.position.toArray().map((n) => Number(n.toFixed(1))),
            scale: current.scale.toArray().map((n) => Number(n.toFixed(2)))
          }
        : null
    })
  }

  return { rebuild: applyParams, dispose }
}
