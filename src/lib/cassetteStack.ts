// 스택(목록 옆면) 보기용 카세트 이미지 — 디자인 id로 매핑 (카세트 세트와 동일 명명)
import stackSimple1 from '../assets/img_cassette_stack_simple1.png'
import stackSimple2 from '../assets/img_cassette_stack_simple2.png'
import stackSimple3 from '../assets/img_cassette_stack_simple3.png'
import stackKitch1 from '../assets/img_cassette_stack_kitch1.png'
import stackKitch2 from '../assets/img_cassette_stack_kitch2.png'
import stackShadow from '../assets/img_cassette_stack_shadow.png'

/** 스택 맨 아래에 항상 붙는 그림자 (353×101) */
export const STACK_SHADOW = stackShadow

const STACK_IMAGES: Record<string, string> = {
  simple_1: stackSimple1,
  simple_2: stackSimple2,
  simple_3: stackSimple3,
  kitch_1: stackKitch1,
  kitch_2: stackKitch2,
}

export function getStackImage(designId: string | undefined): string {
  return (designId && STACK_IMAGES[designId]) || STACK_IMAGES.simple_3
}
