/** @jsx figma.widget.h */

const { widget } = figma;
const { AutoLayout, Text, useSyncedState, useEffect } = widget;

interface NotionData {
  id: string;
  title: string;
  status: string;
}

function NotionWidget() {
  const [data, setData] = useSyncedState<NotionData[]>("notion-data", []);
  const [loading, setLoading] = useSyncedState<boolean>("loading", false);
  const [errorMsg, setErrorMsg] = useSyncedState<string>("errorMsg", "");

  // TODO: 배포 후 이 URL을 Vercel 프로젝트 URL로 변경해야 합니다.
  const PROXY_URL = "https://goodnews-figma.vercel.app/api/notion";
  // 로컬 테스트용 URL: 'http://localhost:3000/api/notion'

  useEffect(() => {
    // 위젯이 처음 캔버스에 렌더링될 때 한 번만 데이터를 불러옵니다.
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
      >
        <Text fontSize={24} fontWeight="bold" fill="#333">
          Notion Tasks
        </Text>
        <AutoLayout
          padding={{ vertical: 8, horizontal: 12 }}
          fill="#F0F0F0"
          cornerRadius={6}
          onClick={loadData}
          hoverStyle={{ fill: "#E4E4E4" }}
        >
          <Text fontSize={14} fontWeight="medium" fill="#555">
            {loading ? "Refreshing..." : "Refresh"}
          </Text>
        </AutoLayout>
      </AutoLayout>

      {errorMsg && (
        <Text fontSize={14} fill="#FF0000">
          Error: {errorMsg}. (Check URL or Notion Token)
        </Text>
      )}

      <AutoLayout direction="vertical" spacing={8}>
        {!loading && data.length === 0 && !errorMsg && (
          <Text fontSize={14} fill="#888">
            No items found.
          </Text>
        )}
        {data.map((item) => (
          <AutoLayout
            key={item.id}
            direction="horizontal"
            spacing={16}
            padding={16}
            fill="#FAFAFA"
            cornerRadius={8}
            stroke="#EEEEEE"
            verticalAlignItems="center"
          >
            <Text fontSize={16} fill="#111" width={200}>
              {item.title}
            </Text>
            <AutoLayout
              padding={{ vertical: 4, horizontal: 12 }}
              fill="#E0F2FE"
              cornerRadius={16}
            >
              <Text fontSize={12} fontWeight="bold" fill="#0284C7">
                {item.status}
              </Text>
            </AutoLayout>
          </AutoLayout>
        ))}
      </AutoLayout>
    </AutoLayout>
  );
}

export default function () {
  widget.register(NotionWidget);
}
