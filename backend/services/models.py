"""
Neural network model class definitions.
These classes mirror the architectures used during training and must not be changed.
"""
import torch
import torch.nn as nn


class GRUModel(nn.Module):
    def __init__(
        self,
        input_size: int,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.3,
        output_size: int = 4,
        bidirectional: bool = True,
    ):
        super().__init__()
        self.bidirectional = bidirectional
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=bidirectional,
        )
        self.fc = nn.Linear(hidden_size * 2 if bidirectional else hidden_size, output_size)

    def forward(self, x, n_future: int = 41):
        out, _ = self.gru(x)
        out = out[:, -n_future:, :]
        return self.fc(out)


class LSTMModel(nn.Module):
    def __init__(
        self,
        input_size: int = 4,
        hidden_size: int = 128,
        num_layers: int = 2,
        dropout: float = 0.3,
        output_size: int = 4,
        n_future: int = 41,
        bidirectional: bool = False,
    ):
        super().__init__()
        self.n_future = n_future
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout,
            bidirectional=bidirectional,
        )
        self.fc = nn.Linear(hidden_size * (2 if bidirectional else 1), output_size)

    def forward(self, x, n_future: int = None):
        if n_future is None:
            n_future = self.n_future
        out, _ = self.lstm(x)
        out = out[:, -n_future:, :]
        return self.fc(out)


class TimeSeriesTransformer(nn.Module):
    def __init__(
        self,
        input_size: int,
        d_model: int = 128,
        nhead: int = 4,
        num_layers: int = 2,
        dim_feedforward: int = 256,
        dropout: float = 0.3,
        output_size: int = 4,
    ):
        super().__init__()
        self.input_fc = nn.Linear(input_size, d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.output_fc = nn.Linear(d_model, output_size)

    def forward(self, x, n_future: int = 41):
        x = self.input_fc(x)
        x = self.transformer_encoder(x)
        return self.output_fc(x[:, -n_future:, :])


class NBeatsBlock(nn.Module):
    def __init__(self, input_size: int, theta_size: int, hidden_size: int = 128, n_layers: int = 2):
        super().__init__()
        layers = []
        in_features = input_size
        for _ in range(n_layers):
            layers.append(nn.Linear(in_features, hidden_size))
            layers.append(nn.ReLU())
            in_features = hidden_size
        self.fc = nn.Sequential(*layers)
        self.theta = nn.Linear(hidden_size, theta_size)

    def forward(self, x):
        x = x.reshape(x.size(0), -1)
        x = self.fc(x)
        return self.theta(x)


class NBeatsModel(nn.Module):
    def __init__(
        self,
        input_size: int,
        theta_size: int,
        points_per_day: int = 41,
        n_future_days: int = 1,
        n_blocks: int = 3,
        hidden_size: int = 128,
        n_layers: int = 2,
    ):
        super().__init__()
        self.blocks = nn.ModuleList(
            [
                NBeatsBlock(
                    input_size=input_size,
                    theta_size=theta_size,
                    hidden_size=hidden_size,
                    n_layers=n_layers,
                )
                for _ in range(n_blocks)
            ]
        )
        self.output_size = input_size
        self.points_per_day = points_per_day
        self.n_future_days = n_future_days

    def forward(self, x):
        out = 0
        for block in self.blocks:
            out = out + block(x)
        # theta_size = points_per_day * n_future_days * n_features
        # Use -1 so PyTorch infers n_features automatically (avoids hardcoding)
        out = out.view(x.size(0), self.n_future_days * self.points_per_day, -1)
        return out
