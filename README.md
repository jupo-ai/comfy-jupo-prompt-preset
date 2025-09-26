# comfy-jupo-prompt-preset

<img src="https://files.catbox.moe/0tv8n1.png" height=400>

プロンプトプリセット挿入拡張機能

## Install

1. custom_nodesフォルダにリポジトリをクローン  
   `git clone https://github.com/jupo-ai/comfy-jupo-prompt-preset`


## Prompt Reciever 使い方

1. 画面左のサイドパネルからプリセットエクスプローラを開きます  
   この時、ComfyUI設定の`Unified sidebar width`をOFFにしておくことをお勧めします  
   ![sample](https://files.catbox.moe/agt0wq.png)
2. 新規作成ボタンを押します  
   ![sample](https://files.catbox.moe/t2q491.png)
3. ファイル編集ダイアログが表示されるので入力します  
   ![sample](https://files.catbox.moe/h08p4n.png)
   - `名前`: エクスプローラに表示される表示名です。未設定の場合はファイル名が表示されるようになります
   - `ファイルパス`: デフォルトでは表示名と同じになります。フォルダ込みのパスにすることでサブフォルダを作成できます
   - `説明`: エクスプローラで表示される説明文です。
   - `チェックポイント`: モデル名のプリセットを設定できます
   - `ポジティブプロンプト`: ポジティブプロンプトのプリセットを設定できます
   - `ネガティブプロンプト`: ネガティブプロンプトのプリセットを設定できます
   - `備考`: ご自由にどうぞ
   - `モード`: 挿入モードの設定です (`append`: プリセット押下ごとに挿入, `overwrite`: プリセット押下ごとにテキストを上書き)
4. `Prompt Reciever`ノードをワークフローに追加します
5. `Prompt Reciever`ノードにプリセットを適用させたいノードの出力を繋ぎます。Recieverノードに繋ぐ出力は何でもいいです。  
   ![sample](https://files.catbox.moe/em7jqq.png)
   - `positive`: 繋がれたノードからtextareaを検出します。複数のtextareaがある場合は1つ目に対応します
   - `negative`: 繋がれたノードからtextareaを検出します。複数のtextareaがある場合は2つ目に対応します
   - `model_name`: 繋がれたノードからcheckpointのcomboウィジェットを検出します
6. サイドパネルのプリセットエクスプローラから作成したプリセットを選択すると、positive, negative, model_nameに対応したプリセットが適用されます。


## Prompt Selector 使い方
1. `Prompt Selector`ノードを追加します  
   ![sample](https://files.catbox.moe/f6onj0.png)
2. 追加ボタンをクリックするとプリセットエクスプローラが開くので、追加したいプリセットを選択します。
3. `Prompt Selector`ノードではプリセットの`モード`( append / overwrite )に関わらず、有効なプリセットのpositive, negativeがそれぞれ結合されて出力されます