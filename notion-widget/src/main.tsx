/** @jsx figma.widget.h */

const { widget } = figma;
const { AutoLayout, Text, useSyncedState, useEffect } = widget;

interface NotionData {
  id: string;
  title: string;
  status: string;
}

function parseDate(dateStr: string) {
  if (!dateStr || dateStr === "No Date" || dateStr === "No Status") return null;
  const parts = dateStr.trim().split("-");
  return new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2])
  );
}

// Function to check if a target date is within start/end bounds (inclusive)
function isDateInRange(target: Date, start: Date, end: Date) {
  // Normalize everything to midnight
  const t = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const s = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  ).getTime();
  const e = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  ).getTime();
  return t >= s && t <= e;
}

function NotionWidget() {
  const [data, setData] = useSyncedState<NotionData[]>("notion-data", []);
  const [loading, setLoading] = useSyncedState<boolean>("loading", false);
  const [errorMsg, setErrorMsg] = useSyncedState<string>("errorMsg", "");

  // Track currently viewed month/year using an offset from today
  const [currentMonthOffset, setCurrentMonthOffset] = useSyncedState<number>(
    "monthOffset",
    0
  );

  const PROXY_URL = "https://goodnews-figma.vercel.app/api/notion";

  useEffect(() => {
    if (data.length === 0 && !loading && !errorMsg) {
      loadData();
    }
  });

  async function loadData() {
    return new Promise<void>(async (resolve) => {
      setLoading(true);
      setErrorMsg("");
      try {
        const response = await fetch(PROXY_URL, {
          method: "POST",
          headers: {
            "x-widget-key": "my_super_secret_key", // 프록시 서버와 동일한 키 사용
          },
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const json = await response.json();
        if (json.results) {
          setData(json.results);
        }
      } catch (err: any) {
        console.error("Failed to fetch notion data:", err);
        setErrorMsg(err.message || "Fetch failed");
      } finally {
        setLoading(false);
        resolve();
      }
    });
  }

  const today = new Date();
  const viewDate = new Date(
    today.getFullYear(),
    today.getMonth() + currentMonthOffset,
    1
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-based

  function getDaysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)

  // Prepare parsed events
  const parsedData = data.map((d) => {
    let startD = null;
    let endD = null;
    if (d.status && d.status !== "No Date" && d.status !== "No Status") {
      const parts = d.status.split(" ~ ");
      startD = parseDate(parts[0]);
      endD = parts[1] ? parseDate(parts[1]) : startD;
    }
    return { ...d, start: startD, end: endD };
  });

  // Build grid
  const weeks: Array<Array<number | null>> = [];
  let currentWeek: Array<number | null> = [];

  // padding for first week
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    currentWeek.push(i);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <AutoLayout
      direction="vertical"
      padding={24}
      spacing={16}
      fill="#FFFFFF"
      cornerRadius={12}
      effect={{
        type: "drop-shadow",
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 4 },
        blur: 12,
        spread: 0,
      }}
    >
      <AutoLayout
        direction="horizontal"
        spacing={24}
        verticalAlignItems="center"
        width={700}
      >
        <AutoLayout
          direction="horizontal"
          spacing={16}
          verticalAlignItems="center"
        >
          <Text fontSize={24} fontWeight="bold" fill="#333">
            {`${year}년 ${month + 1}월`}
          </Text>
          <AutoLayout direction="horizontal" spacing={8}>
            <AutoLayout
              padding={8}
              fill="#F0F0F0"
              cornerRadius={6}
              onClick={() => setCurrentMonthOffset(currentMonthOffset - 1)}
              hoverStyle={{ fill: "#E4E4E4" }}
            >
              <Text fontSize={14}>{"< prev"}</Text>
            </AutoLayout>
            <AutoLayout
              padding={8}
              fill="#F0F0F0"
              cornerRadius={6}
              onClick={() => setCurrentMonthOffset(currentMonthOffset + 1)}
              hoverStyle={{ fill: "#E4E4E4" }}
            >
              <Text fontSize={14}>{"next >"}</Text>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>

        <AutoLayout
          padding={{ vertical: 8, horizontal: 12 }}
          fill="#F0F0F0"
          cornerRadius={6}
          onClick={loadData}
          hoverStyle={{ fill: "#E4E4E4" }}
        >
          <Text fontSize={14} fontWeight="medium" fill="#555">
            {loading ? "Refreshing..." : "Refresh Data"}
          </Text>
        </AutoLayout>
      </AutoLayout>

      {errorMsg ? (
        <Text fontSize={14} fill="#FF0000">
          Error: {errorMsg}
        </Text>
      ) : null}

      <AutoLayout
        direction="vertical"
        spacing={2}
        stroke="#E5E7EB"
        cornerRadius={8}
        padding={2}
        fill="#F9FAFB"
      >
        {/* Header Row */}
        <AutoLayout direction="horizontal" spacing={2}>
          {dayNames.map((dName, i) => (
            <AutoLayout
              key={dName}
              width={100}
              padding={8}
              horizontalAlignItems="center"
            >
              <Text
                fontSize={14}
                fontWeight="bold"
                fill={i === 0 ? "#EF4444" : "#6B7280"}
              >
                {dName}
              </Text>
            </AutoLayout>
          ))}
        </AutoLayout>

        {/* Calendar Grid */}
        {weeks.map((wk, wIdx) => (
          <AutoLayout key={`wk-${wIdx}`} direction="horizontal" spacing={2}>
            {wk.map((dayNum, dIdx) => {
              // Find events for this day
              let dayEvents: any[] = [];
              if (dayNum !== null) {
                const currentCellDate = new Date(year, month, dayNum);
                dayEvents = parsedData.filter((evt) => {
                  if (!evt.start || !evt.end) return false;
                  return isDateInRange(currentCellDate, evt.start, evt.end);
                });
              }
              const isToday =
                dayNum !== null &&
                year === today.getFullYear() &&
                month === today.getMonth() &&
                dayNum === today.getDate();

              return (
                <AutoLayout
                  key={`wk-${wIdx}-d-${dIdx}`}
                  width={100}
                  height={100}
                  fill="#FFFFFF"
                  direction="vertical"
                  padding={8}
                  spacing={4}
                  cornerRadius={4}
                >
                  {dayNum !== null ? (
                    <AutoLayout
                      width="fill-parent"
                      horizontalAlignItems="center"
                      padding={{ bottom: 4 }}
                    >
                      <Text
                        fontSize={14}
                        fontWeight={isToday ? "bold" : "normal"}
                        fill={
                          isToday
                            ? "#2563EB"
                            : dIdx === 0
                            ? "#EF4444"
                            : "#111827"
                        }
                      >
                        {String(dayNum)}
                      </Text>
                    </AutoLayout>
                  ) : null}

                  {/* Render events */}
                  {dayNum !== null ? (
                    <AutoLayout
                      direction="vertical"
                      spacing={4}
                      width="fill-parent"
                    >
                      {dayEvents.slice(0, 3).map((evt, eIdx) => (
                        <AutoLayout
                          key={eIdx}
                          fill="#DBEAFE"
                          cornerRadius={4}
                          padding={{ vertical: 2, horizontal: 4 }}
                          width="fill-parent"
                        >
                          <Text
                            fontSize={10}
                            fill="#1D4ED8"
                            width="fill-parent"
                          >
                            {evt.title.length > 9
                              ? evt.title.substring(0, 9) + ".."
                              : evt.title || "Untitled"}
                          </Text>
                        </AutoLayout>
                      ))}
                      {dayEvents.length > 3 ? (
                        <Text fontSize={10} fill="#6B7280">
                          {`+${dayEvents.length - 3} more`}
                        </Text>
                      ) : null}
                    </AutoLayout>
                  ) : null}
                </AutoLayout>
              );
            })}
          </AutoLayout>
        ))}
      </AutoLayout>
    </AutoLayout>
  );
}

export default function () {
  widget.register(NotionWidget);
}
