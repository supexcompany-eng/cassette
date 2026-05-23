import { useState } from 'react';
import { Reorder } from 'motion/react';
import svgPaths from '../imports/Main-1/svg-l1aok5pcy5';
import imgCassetteTape from '../imports/Main-1/92592b07e4e86db60194b12fd429a4fc457cb9e9.png';
import BtnControl from '../imports/BtnControl/BtnControl';
import IconBack from '../imports/IconBack-1/IconBack';
import IconDelete from '../imports/IconDelete-1/IconDelete';
import Item from '../imports/Item-2/Item-19-1743';

interface RecordingSegment {
  id: number;
  message: string;
  duration: string;
  isActive: boolean;
}

export default function App() {
  const [time, setTime] = useState('00:06');
  const [pressedButton, setPressedButton] = useState<number | null>(null);
  const [segments, setSegments] = useState<RecordingSegment[]>([
    { id: 1, message: '메시지를적을수있음최대글자열다섯', duration: '00:02', isActive: true },
    { id: 2, message: '', duration: '00:02', isActive: true },
    { id: 3, message: '', duration: '00:01', isActive: true },
    { id: 4, message: '', duration: '00:01', isActive: true },
    { id: 5, message: '', duration: '00:01', isActive: true },
    { id: 6, message: '', duration: '00:01', isActive: true },
  ]);

  const handleSegmentChange = (id: number, newMessage: string) => {
    setSegments(segments.map(seg =>
      seg.id === id ? { ...seg, message: newMessage } : seg
    ));
  };

  const handleDeleteSegment = (id: number) => {
    setSegments(segments.filter(seg => seg.id !== id));
  };

  const handleButtonPress = (index: number) => {
    setPressedButton(index);
  };

  const handleButtonRelease = () => {
    setPressedButton(null);
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="w-[393px] h-[852px] bg-[#171717] text-[#E1E1E1] relative overflow-hidden">
        {/* Status Bar */}
        <div className="absolute bg-[#171717] flex h-[44px] items-center justify-between left-0 px-[24px] top-0 w-[393px] z-20">
          <div className="h-[22.5px] w-[36.125px]">
            <p className="font-['Sometype_Mono',monospace] leading-[22.5px] text-[15px] text-[#E1E1E1]">9:41</p>
          </div>
          <div className="h-[12px] w-[17px]">
            <svg className="block size-full" fill="none" viewBox="0 0 17 12">
              <path d={svgPaths.p25887600} stroke="#E1E1E1" strokeOpacity="0.35" />
              <path d={svgPaths.p1600e000} fill="#E1E1E1" />
              <path d={svgPaths.p10a18e00} fill="#E1E1E1" fillOpacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="absolute bg-[#171717] flex h-[64px] items-center justify-between left-0 px-[12px] py-[16px] top-[44px] w-[393px] z-10">
          <button className="relative rounded-[10px] size-[40px] p-[8px]">
            <IconBack />
          </button>
          <p className="flex-1 font-['Sometype_Mono',monospace] leading-[25.5px] text-[17px] text-[#e1e1e1] text-center">tape 01</p>
          <button className="relative rounded-[10px] size-[36px] p-[8px]">
            <IconDelete />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="absolute top-[108px] bottom-[148px] left-0 w-[393px] overflow-y-auto overflow-x-hidden">
          <div className="pb-[100px]">
            {/* Cassette Image */}
            <div className="relative h-[232px] w-[393px]">
              <img
                alt="Cassette Tape"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[231.578px] w-[353px] object-cover"
                src={imgCassetteTape}
              />
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between px-[20px] py-[10px] w-[393px]">
              {[
                { type: 'rew' as const, label: 'REW' },
                { type: 'stop' as const, label: 'STOP' },
                { type: 'play' as const, label: 'PLAY' },
                { type: 'rec' as const, label: 'REC' },
                { type: 'ff' as const, label: 'FF' },
              ].map((btn, index) => (
                <BtnControl
                  key={index}
                  type={btn.type}
                  label={btn.label}
                  isPressed={pressedButton === index}
                  onPress={() => handleButtonPress(index)}
                  onRelease={handleButtonRelease}
                  className="h-[74px] overflow-clip relative rounded-[8px] shrink-0 w-[70px] cursor-pointer"
                />
              ))}
            </div>

            {/* Recording Segments */}
            <div className="flex flex-col gap-[10px] items-start w-[393px]">
              <div className="h-[24px] w-full px-[20px]">
                <div className="flex items-center justify-between px-[4px] size-full">
                  <p className="font-['MaruBuri',sans-serif] leading-[16px] text-[#888] text-[12px] uppercase">녹음 구간</p>
                  <p className="font-['Sometype_Mono',monospace] leading-[16px] text-[#888] text-[12px] text-right tracking-[1.2px] uppercase">{time}</p>
                </div>
              </div>
              <Reorder.Group
                axis="y"
                values={segments}
                onReorder={setSegments}
                className="flex flex-col gap-[8px] w-full px-[20px]"
              >
                {segments.map((segment, index) => (
                  <Reorder.Item
                    key={segment.id}
                    value={segment}
                    className={!segment.isActive ? 'opacity-50' : ''}
                  >
                    <Item
                      count={(index + 1).toString()}
                      message={segment.message}
                      duration={segment.duration}
                      onDelete={() => handleDeleteSegment(segment.id)}
                      onChange={(value) => handleSegmentChange(segment.id, value)}
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-0 h-[148px] left-0 w-[393px]">
          <div className="absolute bg-gradient-to-b from-[rgba(23,23,23,0)] h-[36px] left-0 to-[#171717] top-0 w-[393px]" />
          <div className="absolute bg-[#171717] flex flex-col h-[112px] items-start left-0 pt-[24px] px-[20px] top-[36px] w-[393px]">
            <button className="bg-[#e1e1e1] h-[56px] rounded-[8px] w-full relative">
              <p className="absolute left-1/2 -translate-x-1/2 font-['MaruBuriBold',sans-serif] leading-normal text-[#111] text-[17px] text-center top-[17.25px]">녹음 완료</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}