import svgPaths from "./svg-8zbprudnnw";
import BtnBgPress from "../BtnBg-2/BtnBg-23-2079";

type IconBtnControlProps = {
  className?: string;
  type?: "ff" | "rew" | "stop" | "play" | "rec";
};

function IconBtnControl({ className, type = "rew" }: IconBtnControlProps) {
  const isFf = type === "ff";
  const isPlay = type === "play";
  const isRec = type === "rec";
  const isStop = type === "stop";
  const isStopOrRec = ["stop", "rec"].includes(type);
  return (
    <div className={className || "overflow-clip relative size-[14px]"}>
      <div className={`absolute ${isFf ? "inset-[20.83%_8.33%_20.83%_54.17%]" : isRec ? "-translate-x-1/2 -translate-y-1/2 left-[calc(50%+0.25px)] size-[10px] top-[calc(50%-0.5px)]" : isPlay ? "bottom-[12.5%] left-1/4 right-[16.67%] top-[12.5%]" : isStop ? "-translate-x-1/2 -translate-y-1/2 left-[calc(50%-0.25px)] size-[10px] top-[calc(50%-0.5px)]" : "inset-[20.83%_54.17%_20.83%_8.33%]"}`} data-name="Vector">
        <div className={`absolute ${isPlay ? "inset-[-5.56%_-7.14%]" : isStopOrRec ? "inset-[-5.42%]" : "inset-[-7.14%_-11.11%]"}`}>
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox={isPlay ? "0 0 9.33333 11.6667" : isStopOrRec ? "0 0 11.0833 11.0833" : "0 0 6.41667 9.33334"}>
            <path d={isFf ? svgPaths.p1ac48700 : isRec ? svgPaths.p354ffb00 : isPlay ? svgPaths.p1bf61e80 : isStop ? svgPaths.p2eed0900 : svgPaths.pc9c7d80} fill={isRec ? "var(--fill-0, #FB2C36)" : "var(--fill-0, #E1E1E1)"} id="Vector" stroke={isRec ? "var(--stroke-0, #FB2C36)" : "var(--stroke-0, #E1E1E1)"} strokeLinecap="round" strokeLinejoin="round" strokeWidth={isStopOrRec ? "1.08333" : "1.16667"} />
          </svg>
        </div>
      </div>
      {["rew", "ff"].includes(type) && (
        <div className={`absolute ${isFf ? "inset-[20.83%_54.17%_20.83%_8.33%]" : "inset-[20.83%_8.33%_20.83%_54.17%]"}`} data-name="Vector">
          <div className="absolute inset-[-7.14%_-11.11%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.41667 9.33334">
              <path d={isFf ? svgPaths.p1ac48700 : svgPaths.pc9c7d80} fill="var(--fill-0, #E1E1E1)" id="Vector" stroke="var(--stroke-0, #E1E1E1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
type BtnBgProps = {
  className?: string;
  state?: "nor" | "press";
};

function BtnBg({ className, state = "nor" }: BtnBgProps) {
  const isPress = state === "press";
  return (
    <div className={className || "drop-shadow-[0px_6px_2px_rgba(0,0,0,0.2),0px_2px_0px_rgba(0,0,0,0.3)] relative rounded-[8px] size-[66px]"}>
      <div className={`absolute left-0 rounded-[8px] ${isPress ? "h-[62px] top-[4px] w-[66px]" : "size-[66px] top-0"}`} style={{ backgroundImage: "linear-gradient(90deg, rgb(29, 29, 29) 0%, rgb(26, 26, 26) 13.462%, rgb(26, 26, 26) 87.981%, rgb(19, 19, 19) 100%)" }} />
      <div className={`absolute h-[60px] left-0 rounded-[8px] w-[66px] ${isPress ? "top-[4px]" : "top-0"}`} style={{ backgroundImage: "linear-gradient(127.971deg, rgb(39, 39, 39) 5.3981%, rgba(58, 58, 58, 0) 67.098%)" }} />
      <div className={`absolute blur-[1px] h-[58px] left-px rounded-[8px] w-[64px] ${isPress ? "top-[5px]" : "bg-gradient-to-b from-[#1c1c1c] to-[#242424] top-px via-[#222] via-[85.577%]"}`} style={isPress ? { backgroundImage: "linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(rgb(28, 28, 28) 0%, rgb(34, 34, 34) 85.577%, rgb(36, 36, 36) 100%)" } : undefined} />
    </div>
  );
}

type BtnControlProps = {
  className?: string;
  type?: "ff" | "rew" | "stop" | "play" | "rec";
  label?: string;
  isPressed?: boolean;
  onPress?: () => void;
  onRelease?: () => void;
};

export default function BtnControl({
  className,
  type = "rew",
  label = "REW",
  isPressed = false,
  onPress,
  onRelease
}: BtnControlProps) {
  return (
    <div
      className={className || "h-[74px] overflow-clip relative rounded-[8px] w-[70px]"}
      data-name="btn_control"
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
    >
      {isPressed ? (
        <div className="-translate-x-1/2 absolute left-1/2 size-[66px] top-0">
          <BtnBgPress />
        </div>
      ) : (
        <BtnBg
          className="-translate-x-1/2 absolute drop-shadow-[0px_6px_2px_rgba(0,0,0,0.2),0px_2px_0px_rgba(0,0,0,0.3)] left-1/2 rounded-[8px] size-[66px] top-0"
          state="nor"
        />
      )}
      <div className={`absolute content-stretch flex flex-col gap-[6px] h-[60px] items-center justify-center left-[2px] pt-[4px] rounded-[10px] w-[66px] ${isPressed ? 'top-[4px] opacity-60' : 'top-0 opacity-100'}`} data-name="Button">
        <IconBtnControl className="overflow-clip relative shrink-0 size-[14px]" type={type} />
        <p className="[word-break:break-word] font-['Sometype_Mono',monospace] leading-[15px] not-italic relative shrink-0 text-[#888] text-[8px] text-center whitespace-nowrap">{label}</p>
      </div>
    </div>
  );
}