export default function BtnBg() {
  return (
    <div className="drop-shadow-[0px_6px_2px_rgba(0,0,0,0.2),0px_2px_0px_rgba(0,0,0,0.3)] relative rounded-[8px] size-full" data-name="btn_bg">
      <div className="absolute left-0 rounded-[8px] size-[66px] top-0" style={{ backgroundImage: "linear-gradient(90deg, rgb(29, 29, 29) 0%, rgb(26, 26, 26) 13.462%, rgb(26, 26, 26) 87.981%, rgb(19, 19, 19) 100%)" }} />
      <div className="absolute h-[60px] left-0 rounded-[8px] top-0 w-[66px]" style={{ backgroundImage: "linear-gradient(127.971deg, rgb(39, 39, 39) 5.3981%, rgba(58, 58, 58, 0) 67.098%)" }} />
      <div className="absolute bg-gradient-to-b blur-[1px] from-[#1c1c1c] h-[58px] left-px rounded-[8px] to-[#242424] top-px via-[#222] via-[85.577%] w-[64px]" />
    </div>
  );
}