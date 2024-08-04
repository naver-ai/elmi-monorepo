import requests


# Replace with your actual API token
api_token = 'ENTER TOKEN'
url = 'https://api.vyro.ai/v1/imagine/api/generations'

# Define your prompt
prompt = 'A little cat running on the grass'

# Define headers
headers = {
  'Authorization': f'Bearer {api_token}'
}

# Define the payload
payload = {
  'prompt': (None, prompt),
  'style_id': (None, '21')
}

response = requests.post(url, headers=headers, files=payload)

print(response.status_code)
print(response.json())



if response.status_code == 200:
  with open('image.jpg', 'wb') as f:
    f.write(response.content)
else:
  print('Error:', response.status_code)


# import requests
# import time
# import webbrowser

# # Replace <your-token> with your actual API token
# api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDc0MjgsImVtYWlsIjoiaGNpLm5hdmVyQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiaGNpLm5hdmVyQGdtYWlsLmNvbSIsImlhdCI6MTcxODMzMjQ0MH0.QdkBZkx2WjNZgpSAk1nXkwP6AixKtdSFjHUpP-SIrFM'
# generate_url = 'https://api.imaginepro.ai/api/v1/midjourney/imagine'
# retrieve_url = 'https://api.imaginepro.ai/api/v1/midjourney/message/{}'

# # Define the prompt
# prompt = 'A little cat running on the grass'

# # Prepare the payload
# payload = {
#     'prompt': prompt
# }

# # Prepare the headers
# headers = {
#     'Content-Type': 'application/json',
#     'Authorization': f'Bearer {api_key}'
# }

# # Make the POST request to generate the image
# response = requests.post(generate_url, json=payload, headers=headers)

# # Check the response
# if response.status_code == 200:
#     response_data = response.json()
#     if response_data.get('success'):
#         message_id = response_data['messageId']
#         print(f"Image generation started with Message ID: {message_id}")

#         # Polling logic to check the status until the image is generated
#         while True:
#             retrieve_response = requests.get(retrieve_url.format(message_id), headers=headers)

#             if retrieve_response.status_code == 200:
#                 result_data = retrieve_response.json()
#                 print(f"Response data: {result_data}")

#                 if result_data.get('status') == 'completed':
#                     image_url = result_data.get('imageUrl', 'No image URL provided')
#                     print(f"Image URL: {image_url}")
#                     webbrowser.open(image_url)
#                     break
#                 elif result_data.get('status') == 'FAIL':
#                     print("Image generation failed.")
#                     print(f"Error: {result_data.get('error', 'Unknown error')}")
#                     break
#                 else:
#                     print("The image is still being generated. Checking again in 5 seconds...")
#             else:
#                 print(f"Error: {retrieve_response.status_code}")
#                 print(retrieve_response.json())
#                 break

#             # Wait for 5 seconds before checking again
#             time.sleep(5)
#     else:
#         print("Failed to start image generation.")
#         print(f"Error: {response_data.get('error', 'Unknown error')}")
# else:
#     print(f"Error: {response.status_code}")
#     print(response.json())
