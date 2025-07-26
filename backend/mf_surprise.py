import pickle
import pandas as pd
from surprise import Dataset, Reader, SVD
from surprise.model_selection import train_test_split # Not strictly needed if using pre-split data
from surprise import accuracy
import os

# --- 1. 데이터 로드 및 준비 ---

# 'review_splits.pkl' 파일 경로 (사용자 환경에 맞게 조절)
# 예시: preprocess_output_dir = 'P5-main/data/ml1m_p5_processed/'
# review_splits_file = os.path.join(preprocess_output_dir, 'review_splits.pkl')

# 현재 스크립트와 같은 위치에 있다고 가정
review_splits_file = './data/movietweetings/review_splits.pkl'

try:
    with open(review_splits_file, 'rb') as f:
        review_splits = pickle.load(f)
    print(f"'{review_splits_file}' 파일을 성공적으로 로드했습니다.")
except FileNotFoundError:
    print(f"오류: '{review_splits_file}' 파일을 찾을 수 없습니다.")
    print("data_preprocess_movietweetings.ipynb 스크립트를 먼저 실행하여 파일을 생성했는지, 경로가 올바른지 확인하세요.")
    exit()
except Exception as e:
    print(f"'{review_splits_file}' 파일 로드 중 오류 발생: {e}")
    exit()

# review_splits.pkl에서 train, val, test 데이터 추출
# 각 데이터는 {'reviewerID': ..., 'asin': ..., 'overall': ..., 'title': ...} 형태의 딕셔너리 리스트입니다.
train_data_list = review_splits.get('train')
val_data_list = review_splits.get('val') # 검증 세트 (하이퍼파라미터 튜닝 등에 활용 가능)
test_data_list = review_splits.get('test')

if train_data_list is None or test_data_list is None:
    print("오류: 'review_splits.pkl' 파일에 'train' 또는 'test' 데이터가 없습니다.")
    exit()

print(f"Train 데이터 개수: {len(train_data_list)}")
print(f"Validation 데이터 개수: {len(val_data_list) if val_data_list else 0}")
print(f"Test 데이터 개수: {len(test_data_list)}")

# Surprise 라이브러리에서 사용할 수 있도록 Pandas DataFrame으로 변환
# Surprise는 'userID', 'itemID', 'rating' 컬럼명을 기본으로 사용합니다.
# 'reviewerID' -> 'userID', 'asin' -> 'itemID', 'overall' -> 'rating'으로 매핑합니다.
train_df = pd.DataFrame(train_data_list)[['reviewerID', 'asin', 'overall']]
train_df.columns = ['userID', 'itemID', 'rating']

val_df = pd.DataFrame(val_data_list)[['reviewerID', 'asin', 'overall']]
val_df.columns = ['userID', 'itemID', 'rating']

test_df = pd.DataFrame(test_data_list)[['reviewerID', 'asin', 'overall']]
test_df.columns = ['userID', 'itemID', 'rating']

reader = Reader(rating_scale=(0, 10)) # 원본 데이터의 평점 범위를 확인하고 필요시 조절

# Pandas DataFrame에서 Surprise Dataset 로드
trainset = Dataset.load_from_df(train_df, reader).build_full_trainset()
# testset은 raw ratings 형태로 유지 (튜플 리스트: (uid, iid, r_ui_actual))
testset = Testset = [(uid, iid, actual_rating) for uid, iid, actual_rating in test_df.itertuples(index=False)]
validationset = [(uid, iid, actual_rating) for uid, iid, actual_rating in val_df.itertuples(index=False)]


# --- 2. 모델 학습 (SVD 알고리즘 사용) ---
# 사용할 알고리즘 초기화 (예: SVD)
# 하이퍼파라미터는 필요에 따라 조정할 수 있습니다. (예: 검증 세트를 사용하여 최적화)
algo = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02, random_state=42)

print("\nSVD 모델 학습 시작...")
algo.fit(trainset)
print("모델 학습 완료.")

# --- 3. 모델 평가 (Test Set 사용) ---
print("\nTest Set으로 모델 평가 시작...")
predictions = algo.test(testset)

# RMSE (Root Mean Squared Error) 및 MAE (Mean Absolute Error) 계산
rmse = accuracy.rmse(predictions)
mae = accuracy.mae(predictions)

print(f"Test Set RMSE: {rmse:.4f}")
print(f"Test Set MAE: {mae:.4f}")

# (선택 사항) Validation Set으로도 평가
#if validationset:
#    print("\nValidation Set으로 모델 평가 시작...")
#    val_predictions = algo.test(validationset)
#    val_rmse = accuracy.rmse(val_predictions)
#    val_mae = accuracy.mae(val_predictions)
#    print(f"Validation Set RMSE: {val_rmse:.4f}")
#    print(f"Validation Set MAE: {val_mae:.4f}")


# --- 4. 모델 저장 ---
# Surprise 라이브러리는 자체적인 방식으로 모델을 저장합니다 (pickle 사용).
# .pth 파일은 주로 PyTorch 모델을 저장할 때 사용되는 확장자입니다.
# Surprise 모델을 저장하려면 surprise.dump 모듈을 사용합니다.

model_dump_file = 'surprise_svd_model.pkl'
print(f"\n학습된 모델을 '{model_dump_file}' 파일로 저장 중...")
try:
    from surprise import dump
    dump.dump(model_dump_file, algo=algo)
    # dump.dump(model_dump_file, predictions=predictions, algo=algo) # 예측 결과도 함께 저장 가능
    print(f"모델이 '{model_dump_file}'에 성공적으로 저장되었습니다.")
    print("저장된 모델을 로드하려면 'dump.load(file_name)' 함수를 사용하세요. 로드 시 algo 객체만 반환됩니다.")
except Exception as e:
    print(f"모델 저장 중 오류 발생: {e}")


# --- 5. 특정 사용자와 아이템에 대한 예측 (예시) ---
# 예시 사용자 ID와 아이템 ID (review_splits.pkl에 있는 매핑된 ID 사용)
# train_df에서 존재하는 userID와 itemID를 사용해야 정확한 예측 가능
if not train_df.empty:
    example_user_id = train_df['userID'].iloc[0]
    example_item_id = train_df['itemID'].iloc[0]

    # 이미 학습된 algo 객체를 사용하여 예측
    predicted_rating = algo.predict(uid=example_user_id, iid=example_item_id)

    print(f"\n예측 예시:")
    print(f"사용자 ID '{predicted_rating.uid}'의 아이템 ID '{predicted_rating.iid}'에 대한 예측 평점: {predicted_rating.est:.4f}")
    print(f"(실제 평점: {predicted_rating.r_ui})") # testset에 있는 경우 실제 평점도 함께 반환됨
else:
    print("\nTrain DataFrame이 비어있어 예측 예시를 실행할 수 없습니다.")
