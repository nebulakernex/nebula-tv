async function test() {
  const url = "https://ga-mobile-api.loklok.tv/cms/app/homePage/getHome?page=0";
  const res = await fetch(url, {
    headers: {
      lang: "en",
      versioncode: "11",
      clienttype: "ios_jike_default"
    }
  });
  const data = await res.json();
  const items = data.data.recommendItems;
  console.log(items.length, "sections found");
  
  if (items.length > 0) {
    const movies = items[0].recommendContentVOList;
    console.log(movies.length, "movies in first section");
    if (movies.length > 0) {
      console.log(movies[0]);
    }
  }
}
test();
