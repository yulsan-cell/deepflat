# 3D 소품 출처 (Credits)

모든 원본은 [Poly Haven](https://polyhaven.com)의 **CC0** 자산입니다. 저작자 표기 의무는 없지만 감사의 뜻으로 적어 둡니다.
가공 내용: 크기·방향 확인(glTF Y-up, 앞면 +Z, 원점은 바닥 중앙), 폴리곤 줄이기(Decimate), 텍스처 512 px로 축소(0.4 m 미만 소품 `plant_aloe`·`vase_*`는 256 px), WebP로 GLB에 내장. 닫힌 메시만 쓰는 재질은 단면(doubleSided 끔), 잎(MASK)과 열린 메시는 양면.

## 웹 소품 라이브러리 (`final/models/*.glb`, 목록은 `library.json`)

### 모델

| Poly Haven 자산 | 저작자 | 쓰인 파일 |
|---|---|---|
| [Mid Century Lounge Chair](https://polyhaven.com/a/mid_century_lounge_chair) | Kuutti Siitonen | `lounge_chair.glb` |
| [Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01) | Vibrant Nordic | `armchair.glb` |
| [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01) | Ulan Cabanilla | `coffee_table.glb` |
| [Side Table 01](https://polyhaven.com/a/side_table_01) | James Ray Cock | `side_table.glb` |
| [Modern Wooden Cabinet](https://polyhaven.com/a/modern_wooden_cabinet) | Patrik Pangerl | `sideboard.glb` |
| [Steel Frame Shelves 03](https://polyhaven.com/a/steel_frame_shelves_03) | Ulan Cabanilla | `shelf_steel_oak.glb` |
| [Ceramic Vase 01](https://polyhaven.com/a/ceramic_vase_01) | James Ray Cock | `vase_bulb.glb`, `table_lamp.glb` (받침, 세이지색으로 틴트) |
| [Ceramic Vase 02](https://polyhaven.com/a/ceramic_vase_02) | James Ray Cock | `vase_wide.glb` |
| [Ceramic Vase 04](https://polyhaven.com/a/ceramic_vase_04) | James Ray Cock | `vase_bottle.glb` |
| [Wooden Bowl 02](https://polyhaven.com/a/wooden_bowl_02) | Kuutti Siitonen | `bowl_wood.glb` |
| [Modern Ceiling Lamp 01](https://polyhaven.com/a/modern_ceiling_lamp_01) | James Ray Cock | `pendant_globe.glb` |
| [Potted Plant 01](https://polyhaven.com/a/potted_plant_01) | Rico Cilliers | `plant_tall.glb` |
| [Potted Plant 02](https://polyhaven.com/a/potted_plant_02) | Rico Cilliers | `plant_syngonium.glb` |
| [Potted Plant 04](https://polyhaven.com/a/potted_plant_04) | James Ray Cock | `plant_aloe.glb` |
| [Periwinkle Plant](https://polyhaven.com/a/periwinkle_plant) | Amal Kumar | `plant_flower.glb` (꽃 5줄기) |
| [Planter Pot Clay](https://polyhaven.com/a/planter_pot_clay) | Amal Kumar | `plant_flower.glb` (화분) |
| [Decorative Book Set 01](https://polyhaven.com/a/decorative_book_set_01) | James Ray Cock | `books_row.glb` (7권), `books_stack.glb` (3권) — 표지 색을 아틀라스 1장에 베이크 |

### 텍스처 (Blender에서 직접 만든 소품에 사용)

| Poly Haven 자산 | 저작자 | 쓰인 파일 |
|---|---|---|
| [Rough Linen](https://polyhaven.com/a/rough_linen) | colormass, Rico Cilliers | `sofa.glb`(세이지), `bed.glb`(흰색·샌드·세이지), `table_lamp.glb`(크림 갓), `dining_chair.glb`(샌드 좌판) — 색만 DEEPFLAT 팔레트로 틴트 |
| [Oak Veneer 01](https://polyhaven.com/a/oak_veneer_01) | Jenelle van Heerden | `sofa.glb`(다리), `dining_table.glb`, `bed.glb`(프레임), `dining_chair.glb`, `bar_stool.glb` |

`sofa.glb`, `dining_table.glb`, `bed.glb`, `dining_chair.glb`(오크 의자), `bar_stool.glb`(오크·황동 카운터 스툴)의 형태와 `table_lamp.glb`의 갓·금속 부품은 이 작업에서 Blender로 직접 모델링했습니다(Poly Haven에 현대적인 소파·식탁·침대·의자가 없어서). 이전 판의 `dining_chair.glb`(Painted Wooden Chair 01)와 `bar_stool.glb`(Metal Stool 01)는 하이엔드 아파트 톤에 맞지 않아 교체했고, 지금 라이브러리에는 쓰이지 않습니다.
원본 작업 파일: `final/models/blender/<이름>.blend`.

## 단면 방 렌더 (`images/carousel-blender/`, 목록은 `final/data/carousel-blender.json`)

거실·주방·다이닝·침실·서재·욕실 다섯 장은 위 소품 라이브러리에 아래 Poly Haven CC0 자산을 더해 Blender(Cycles, Khronos PBR Neutral)로 렌더했습니다. 방은 투명 배경으로, 바닥 그림자는 따로 렌더해 세이지 그라디언트 배경 위에 합성했습니다.
방 껍데기, 주방 하부장·아일랜드, 욕조·세면대·거울·수전, 책상·벤치·플로어 램프, 액자와 그 안의 그림은 이 작업에서 직접 모델링하거나 그렸습니다.
원본 작업 파일: `final/models/blender/room-<방>.blend` (외부 텍스처는 `final/models/blender/rooms_tex/`), 2400×1600 PNG 원본은 `final/models/blender/renders/room-<방>.png`.

### 모델

| Poly Haven 자산 | 저작자 | 쓰인 곳 |
|---|---|---|
| [Lemon](https://polyhaven.com/a/lemon) | Kuutti Siitonen | 주방 (볼 안의 레몬) |
| [Food Apple 01](https://polyhaven.com/a/food_apple_01) | Oliver Harries | 주방 (식탁 위 사과) |
| [Wine Bottles 01](https://polyhaven.com/a/wine_bottles_01) | Rico Cilliers, Jurita Burger | 주방 (조리대 위 병) |
| [Calathea Orbifolia 01](https://polyhaven.com/a/calathea_orbifolia_01) | Rob Tuytel, Rico Cilliers | 욕실 (흰 화분의 칼라테아) |
| [Wicker Basket 02](https://polyhaven.com/a/wicker_basket_02) | Kuutti Siitonen | 욕실 (세면대 옆 바구니) |

### 텍스처·HDRI

| Poly Haven 자산 | 저작자 | 쓰인 곳 |
|---|---|---|
| [Kloofendal Overcast (Pure Sky)](https://polyhaven.com/a/kloofendal_overcast_puresky) | Greg Zaal | 다섯 방 모두의 낮 하늘빛(HDRI, 약하게) |
| [Herringbone Parquet](https://polyhaven.com/a/herringbone_parquet) | Jenelle van Heerden, Sergej Majboroda | 거실 바닥 |
| [Laminate Floor 02](https://polyhaven.com/a/laminate_floor_02) | Dario Barresi, Charlotte Baglioni | 침실·서재 마루 |
| [Marble 01](https://polyhaven.com/a/marble_01) | Rob Tuytel | 주방 바닥 석재 타일 (따뜻한 베이지로 틴트) |
| [Terrazzo Tiles](https://polyhaven.com/a/terrazzo_tiles) | Amal Kumar | 욕실 바닥 (밝게 틴트) |
| [Long White Tiles](https://polyhaven.com/a/long_white_tiles) | Jenelle van Heerden, Sergej Majboroda | 욕실 벽 타일 |
| [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | Amal Kumar | 모든 방의 벽 미장 질감(노멀) |
| [Oak Veneer 01](https://polyhaven.com/a/oak_veneer_01) | Jenelle van Heerden | 선반·액자·책상·벤치·세면대·주방 키큰장 (서재 책상 상판은 월넛 톤으로 틴트) |
| [Rough Linen](https://polyhaven.com/a/rough_linen) | colormass, Rico Cilliers | 러그·쿠션·벤치·수건 직물 질감(노멀) |
| [Wool Boucle](https://polyhaven.com/a/wool_boucle) | colormass, Rico Cilliers | 침실 암체어의 부클레 직물 질감(노멀만, 색은 크림) |
